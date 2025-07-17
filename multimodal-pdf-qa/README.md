# Multimodal PDF QA Agent

A modern, conversational AI agent that can answer questions about PDF documents using Retrieval-Augmented Generation (RAG). Built with Next.js frontend and FastAPI backend.

## Features

- **Modern Chat Interface**: Beautiful, responsive web UI similar to ChatGPT
- **PDF Document Processing**: Upload and process PDF documents for Q&A
- **RAG-powered Answers**: Uses OpenAI GPT-4 with document context for accurate responses
- **Citation Support**: View source chunks for every answer
- **Conversational Memory**: Maintains chat history for context-aware conversations
- **Real-time Chat**: Instant responses with typing indicators
- **Document Management**: Upload multiple documents and switch between them

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Headless UI** for accessible components

### Backend
- **FastAPI** for high-performance API
- **OpenAI GPT-4** for text generation
- **OpenAI Embeddings** for vector search
- **ChromaDB** for vector database
- **pdfplumber** for PDF text extraction

## Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd multimodal-pdf-qa
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Add your OpenAI API key
   echo "your-openai-api-key-here" > openai_key.txt
   
   # Start the backend server
   python api.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Usage

1. **Upload a PDF**: Click "Upload PDF" in the sidebar
2. **Ask Questions**: Type your questions in the chat interface
3. **View Citations**: Click "View citations" to see source chunks
4. **Switch Documents**: Select different documents from the sidebar

## API Endpoints

- `POST /upload-document` - Upload and process PDF
- `POST /chat` - Send message and get AI response
- `GET /documents` - List all uploaded documents
- `GET /health` - Health check

## Project Structure

```
multimodal-pdf-qa/
├── frontend/                 # Next.js React app
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   └── components/      # React components
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── api.py              # Main API server
│   ├── requirements.txt    # Python dependencies
│   └── openai_key.txt     # API key (not in git)
└── README.md
```

## Development

### Adding New Features

1. **Multimodal Support**: Add image processing with OCR
2. **File Type Expansion**: Support Excel, Word, PowerPoint
3. **User Authentication**: Add login/signup functionality
4. **Database Integration**: Replace in-memory storage with PostgreSQL
5. **Real-time Updates**: Add WebSocket support for live chat

### Environment Variables

Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Deployment

### Backend (FastAPI)
- Deploy to Railway, Render, or Heroku
- Set environment variables for API keys
- Use PostgreSQL for production database

### Frontend (Next.js)
- Deploy to Vercel for optimal performance
- Configure environment variables
- Set up custom domain if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- OpenAI for GPT-4 and embeddings
- ChromaDB for vector database
- Next.js team for the amazing framework
- FastAPI for the high-performance API framework 