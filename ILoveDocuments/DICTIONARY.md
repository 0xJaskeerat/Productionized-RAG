```markdown
# 🔑 KEYWORD DICTIONARY (Know These Cold)

| Term | Plain English |
| :--- | :--- |
| **RAG** | Feed relevant docs to an LLM at query time so it answers from YOUR data, not hallucinations |
| **Embedding** | A list of numbers (vector) that captures the meaning of text. Similar meaning = similar numbers |
| **Vector Store** | A database optimized to search by meaning/similarity, not exact keywords |
| **Chunking** | Splitting documents into smaller pieces before embedding — critical for retrieval accuracy |
| **Cosine Similarity** | How "close" two vectors are. The math behind "find most relevant chunk" |
| **Context Window** | Max tokens an LLM can process at once. RAG works around this limitation |
| **Retrieval** | Step 1: Find the most relevant chunks for a query |
| **Augmentation** | Step 2: Inject retrieved chunks into the LLM prompt |
| **Generation** | Step 3: LLM produces the final answer using the context |
| **Top-K** | How many chunks to retrieve — usually 3-10, tune this |
| **Re-ranking** | After retrieval, re-score results with a smarter model for better precision |
| **Hallucination** | LLM making up confident-sounding BS. RAG reduces this significantly |
| **Fine Tuning** | Model tuning optimizes a ML model’s hyperparameters to obtain the best training performance. The process involves making adjustments until the optimal set of hyperparameter values is found, resulting in improved accuracy, generation quality and other performance metrics.
```