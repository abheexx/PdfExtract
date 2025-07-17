from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import pdfplumber
import openai
import chromadb
from chromadb.config import Settings
import tempfile
import os
from tqdm import tqdm
from openai import OpenAI
from typing import List, Dict, Any
import json

# --- CONFIG ---
CHUNK_SIZE = 800  # characters per chunk
CHUNK_OVERLAP = 200
EMBED_MODEL = "text-embedding-ada-002"
RETRIEVE_K = 5

app = FastAPI(title="Multimodal PDF QA API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for documents (in production, use a proper database)
documents = {}
chat_histories = {}  # Now keyed by doc_id

# --- HELPER FUNCTIONS ---
def get_api_key():
    key_file = "openai_key.txt"
    api_key = None
    if os.path.exists(key_file):
        with open(key_file, "r") as f:
            lines = [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]
            if lines:
                api_key = lines[0]
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not found")
    return api_key

def extract_text_from_pdf(pdf_file):
    text = ""
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def embed_chunks(chunks, api_key):
    client = OpenAI(api_key=api_key)
    embeddings = []
    for chunk in chunks:
        resp = client.embeddings.create(input=chunk, model=EMBED_MODEL)
        embeddings.append(resp.data[0].embedding)
    return embeddings

def build_vector_db(chunks, embeddings, doc_id):
    client = chromadb.Client(Settings(anonymized_telemetry=False))
    collection_name = f"doc_{doc_id}"
    
    # Delete the collection if it already exists
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass  # Ignore if it doesn't exist
    
    collection = client.create_collection(collection_name)
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        collection.add(
            documents=[chunk],
            embeddings=[emb],
            ids=[str(i)]
        )
    return collection

def retrieve_relevant_chunks(question, collection, api_key, k=RETRIEVE_K):
    client = OpenAI(api_key=api_key)
    resp = client.embeddings.create(input=question, model=EMBED_MODEL)
    q_emb = resp.data[0].embedding
    results = collection.query(query_embeddings=[q_emb], n_results=k)
    return results["documents"][0], results["ids"][0]

# --- API ENDPOINTS ---
@app.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF document and process it for QA"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Extract text
        text = extract_text_from_pdf(tmp_file_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Chunk text
        chunks = chunk_text(text)
        
        # Get API key
        api_key = get_api_key()
        
        # Embed chunks
        embeddings = embed_chunks(chunks, api_key)
        
        # Build vector database
        doc_id = len(documents) + 1
        collection = build_vector_db(chunks, embeddings, doc_id)
        
        # Store document info
        documents[doc_id] = {
            "filename": file.filename,
            "chunks": chunks,
            "collection": collection,
            "text": text
        }
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        return {
            "doc_id": doc_id,
            "filename": file.filename,
            "chunks_count": len(chunks),
            "message": "Document processed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.post("/chat")
async def chat(
    doc_id: int = Form(...),
    message: str = Form(...)
):
    """Send a message and get AI response"""
    if doc_id not in documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        api_key = get_api_key()
        doc_info = documents[doc_id]
        collection = doc_info["collection"]
        
        # Initialize chat history for this doc if not exists
        if doc_id not in chat_histories:
            chat_histories[doc_id] = []
        
        # Retrieve relevant chunks
        context_chunks, chunk_ids = retrieve_relevant_chunks(message, collection, api_key)
        
        # Build conversation context (last 5 turns)
        conversation = chat_histories[doc_id][-5:] if len(chat_histories[doc_id]) > 0 else []
        messages = []
        for turn in conversation:
            if turn["role"] == "user":
                messages.append({"role": "user", "content": turn["content"]})
            else:
                messages.append({"role": "assistant", "content": turn["content"]})
        
        # Add current user question
        messages.append({"role": "user", "content": message})
        
        # Add system/context message
        context = "\n\n".join(context_chunks)
        system_prompt = (
            "You are a helpful assistant. Answer the user's question using ONLY the provided context from a PDF. "
            "If the answer is not in the context, say 'I don't know.'\n\n"
            f"Context:\n{context}"
        )
        
        # Insert system prompt at the start
        messages = [{"role": "system", "content": system_prompt}] + messages
        
        # Get AI response
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.0,
            max_tokens=512,
        )
        answer = response.choices[0].message.content.strip()
        
        # Update chat history for this doc
        chat_histories[doc_id].append({"role": "user", "content": message})
        chat_histories[doc_id].append({
            "role": "assistant", 
            "content": answer, 
            "citations": chunk_ids, 
            "chunks": context_chunks
        })
        
        return {
            "answer": answer,
            "citations": chunk_ids,
            "chunks": context_chunks,
            "chat_history": chat_histories[doc_id]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.get("/documents")
async def list_documents():
    """List all uploaded documents"""
    return {
        "documents": [
            {
                "doc_id": doc_id,
                "filename": doc_info["filename"],
                "chunks_count": len(doc_info["chunks"])
            }
            for doc_id, doc_info in documents.items()
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "API is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 