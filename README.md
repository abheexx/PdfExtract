# PDF Question Answering AI Agent

This project is a Streamlit web app that allows you to upload a large PDF and ask questions about its content. It uses OpenAI's GPT-4 and embeddings, with guardrails to minimize hallucinations and ensure accurate, citation-backed answers.

## Features
- Upload any PDF and ask questions about its content
- Uses Retrieval-Augmented Generation (RAG) for accurate answers
- Answers are always grounded in the PDF, with citations
- Guardrails: "I don't know" if answer is not in the document

## Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Set your OpenAI API key:**
   - You can set it as an environment variable:
     ```bash
     export OPENAI_API_KEY=your-key-here
     ```
   - Or you will be prompted to enter it in the app.

## Usage

1. Run the app:
   ```bash
   streamlit run app.py
   ```
2. Upload your PDF and start asking questions!

## Notes
- This app uses OpenAI's GPT-4 and embedding models (API costs may apply).
- All answers are based strictly on the PDF content.
- For best results, use clear, specific questions. 