import streamlit as st
import pdfplumber
import openai
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import tempfile
import os
from tqdm import tqdm
from openai import OpenAI

# --- CONFIG ---
CHUNK_SIZE = 800  # characters per chunk
CHUNK_OVERLAP = 200
EMBED_MODEL = "text-embedding-ada-002"
RETRIEVE_K = 5

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
        api_key = st.text_input("Enter your OpenAI API Key", type="password")
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
    for chunk in tqdm(chunks, desc="Embedding chunks"):
        resp = client.embeddings.create(input=chunk, model=EMBED_MODEL)
        embeddings.append(resp.data[0].embedding)
    return embeddings

def build_vector_db(chunks, embeddings):
    client = chromadb.Client(Settings(anonymized_telemetry=False))
    # Delete the collection if it already exists
    try:
        client.delete_collection("pdf_chunks")
    except Exception:
        pass  # Ignore if it doesn't exist
    collection = client.create_collection("pdf_chunks")
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

def answer_question(question, context_chunks, api_key):
    client = OpenAI(api_key=api_key)
    context = "\n\n".join(context_chunks)
    prompt = (
        "You are a helpful assistant. Answer the question using ONLY the provided context from a PDF. "
        "If the answer is not in the context, say 'I don't know.'\n\n"
        f"Context:\n{context}\n\nQuestion: {question}\nAnswer: "
    )
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=512,
    )
    return response.choices[0].message.content.strip()

# --- STREAMLIT UI ---
st.set_page_config(page_title="PDF Question Answering AI Agent", layout="wide")
st.title("PDF Question Answering AI Agent 🦾")

st.write("Upload a PDF, ask questions, and get accurate, citation-backed answers.")

api_key = get_api_key()
if not api_key:
    st.warning("Please enter your OpenAI API key.")
    st.stop()

uploaded_file = st.file_uploader("Upload your PDF", type=["pdf"])

if uploaded_file:
    with st.spinner("Extracting text from PDF..."):
        text = extract_text_from_pdf(uploaded_file)
    st.success("Text extracted.")
    
    with st.spinner("Chunking text..."):
        chunks = chunk_text(text)
    st.success(f"Text split into {len(chunks)} chunks.")

    if "embeddings" not in st.session_state or st.session_state.get("pdf_name") != uploaded_file.name:
        with st.spinner("Embedding and indexing chunks (this may take a while)..."):
            embeddings = embed_chunks(chunks, api_key)
            collection = build_vector_db(chunks, embeddings)
            st.session_state.embeddings = embeddings
            st.session_state.chunks = chunks
            st.session_state.collection = collection
            st.session_state.pdf_name = uploaded_file.name
        st.success("PDF indexed and ready for questions!")
    else:
        collection = st.session_state.collection
        chunks = st.session_state.chunks

    # --- Conversational State ---
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []  # Each item: {"role": "user"/"assistant", "content": str, "citations": [chunk_ids]}

    # Display chat history
    for msg in st.session_state.chat_history:
        if msg["role"] == "user":
            st.markdown(f"**You:** {msg['content']}")
        else:
            st.markdown(f"**Bot:** {msg['content']}")
            if msg.get("citations"):
                st.markdown("**Citations:**")
                for i, chunk in zip(msg["citations"], msg.get("chunks", [])):
                    with st.expander(f"Chunk {i}"):
                        st.write(chunk)

    # User input
    def process_message():
        if st.session_state.get("user_input", "").strip():
            st.session_state["current_message"] = st.session_state["user_input"].strip()
            st.session_state["process_message"] = True

    # Clear input before rendering the widget if a message was just processed
    if st.session_state.get("process_message", False):
        st.session_state["user_input"] = ""

    question = st.text_input("Your message (press Enter to send):", key="user_input", on_change=process_message)
    
    # Initialize process_message flag if not exists
    if "process_message" not in st.session_state:
        st.session_state["process_message"] = False
    
    # Process message if flag is set and we have a message to process
    if st.session_state["process_message"] and st.session_state.get("current_message", "").strip():
        question = st.session_state["current_message"].strip()
        st.session_state["process_message"] = False  # Reset flag
        st.session_state["current_message"] = ""  # Clear the message
        
        with st.spinner("Retrieving relevant context and generating answer..."):
            context_chunks, chunk_ids = retrieve_relevant_chunks(question, collection, api_key)
            # Build conversation context for the prompt (last 5 turns)
            conversation = st.session_state.chat_history[-5:] if len(st.session_state.chat_history) > 0 else []
            messages = []
            for turn in conversation:
                if turn["role"] == "user":
                    messages.append({"role": "user", "content": turn["content"]})
                else:
                    messages.append({"role": "assistant", "content": turn["content"]})
            # Add current user question
            messages.append({"role": "user", "content": question})
            # Add system/context message
            context = "\n\n".join(context_chunks)
            system_prompt = (
                "You are a helpful assistant. Answer the user's question using ONLY the provided context from a PDF. "
                "If the answer is not in the context, say 'I don't know.'\n\n"
                f"Context:\n{context}"
            )
            # Insert system prompt at the start
            messages = [{"role": "system", "content": system_prompt}] + messages
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                temperature=0.0,
                max_tokens=512,
            )
            answer = response.choices[0].message.content.strip()
        # Update chat history
        st.session_state.chat_history.append({"role": "user", "content": question})
        st.session_state.chat_history.append({"role": "assistant", "content": answer, "citations": chunk_ids, "chunks": context_chunks})
        st.rerun() 