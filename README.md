# PdfExtract - Multimodal PDF Question Answering AI

A modern web application that allows users to upload PDF documents and have intelligent conversations with an AI about the content. Built with FastAPI backend and Next.js frontend.

## Features

- 📄 **PDF Upload & Processing**: Upload and process PDF documents with text extraction
- 🤖 **AI-Powered Q&A**: Ask questions about your documents using OpenAI GPT-4
- 💬 **Conversational Interface**: Maintain chat history for each document
- 🎨 **Modern UI**: Beautiful, responsive interface with dark/light mode
- 🔍 **Semantic Search**: Advanced document retrieval using embeddings
- 📱 **Real-time Chat**: Instant responses with streaming capabilities

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **OpenAI GPT-4**: Advanced language model for Q&A
- **OpenAI Embeddings**: Semantic document search
- **FAISS**: Vector database for similarity search
- **PyPDF2**: PDF text extraction

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form handling
- **Lucide React**: Beautiful icons

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API key

### Backend Setup
1. **Navigate to backend directory**:
   ```bash
   cd multimodal-pdf-qa/backend
   ```
2. **Create virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Set up OpenAI API key**:
   ```bash
   echo "your-openai-api-key-here" > openai_key.txt
   ```
5. **Start the backend server**:
   ```bash
   python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
   ```

The backend will be available at `http://localhost:8000`

### Frontend Setup
1. **Navigate to frontend directory**:
   ```bash
   cd ../frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## Usage
1. **Upload a PDF**: Click the upload button and select your PDF document
2. **Start Chatting**: Ask questions about the content of your document
3. **View History**: Your conversation history is saved per document
4. **Switch Documents**: Upload multiple documents and switch between them

## API Endpoints
- `POST /upload`: Upload a PDF document
- `GET /documents`: Get list of uploaded documents
- `POST /chat`: Send a message and get AI response
- `GET /chat/{document_id}`: Get chat history for a document

## Security
- OpenAI API keys are stored locally and excluded from version control
- All sensitive files are properly gitignored
- No API keys are exposed in the frontend

## Development

### Project Structure
```
multimodal-pdf-qa/
├── backend/
│   ├── api.py              # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── openai_key.txt     # API key (not in git)
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   └── lib/           # Utility functions
│   ├── package.json       # Node.js dependencies
│   └── next.config.ts     # Next.js configuration
└── README.md
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
MIT License - feel free to use this project for your own applications!

## Support
If you encounter any issues or have questions, please open an issue on GitHub. 