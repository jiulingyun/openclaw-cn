# Model: Xenova/bge-small-zh-v1.5

This directory is a placeholder for the `Xenova/bge-small-zh-v1.5` model files, which are used for local embedding generation via Transformers.js.

## Files Structure

The expected file structure for the model is:

```
.
├── config.json
├── onnx
│   └── model.onnx
├── sentencepiece.bpe.model
├── special_tokens_map.json
├── tokenizer.json
└── tokenizer_config.json
```

## Download Instructions

The model files are **not tracked in Git by default** and must be downloaded before use. The `.gitignore` file at the repository root is configured to ignore the contents of this directory. If you decide that the model size is acceptable for version control, you can remove the corresponding entry from `.gitignore` and check the files in.

### Option 1: Hugging Face (Recommended for Dev)

Use `huggingface-cli` to download the model directly from the Hugging Face Hub. Run this command from the `openclaw` repository root:

```bash
huggingface-cli download \
  Xenova/bge-small-zh-v1.5 \
  --local-dir ./extensions/memory-lancedb/models/bge-small-zh-v1.5 \
  --include "*.json,*.model,onnx/*"
```

### Option 2: Internal TOS (Recommended for Production/CI)

For production environments, download the versioned model artifact from an internal object store (like TOS) to ensure consistency.

```bash
# Example commands (run from the 'extensions/memory-lancedb' directory):

# 1. Download the model archive from your internal source
# wget https://your-internal-tos-bucket/path/to/bge-small-zh-v1.5.tar.gz

# 2. Extract into the target directory
# tar -xzvf bge-small-zh-v1.5.tar.gz -C ./models/
```
