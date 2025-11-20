# EPUB to Markdown Converter

A simple Node.js tool to convert EPUB files into Markdown.

## Installation

1.  Clone this repository.
2.  Install dependencies:

    ```bash
    npm install
    npm link
    ```

    *Note: `npm link` makes the `epub2md` command available globally on your system.*

## Usage

Run the script with the path to your EPUB file:

```bash
epub2md <path-to-epub> [options]
```

### Options

*   `--overwrite`: Overwrite the output file if it already exists.
*   `--keep`: If the output file exists, keep it and save the new file with a numbered suffix (e.g., `filename_1.md`).

If no option is provided and the output file exists, the script will prompt you to choose an action.

## Example

```bash
epub2md my-book.epub
```

This will create `my-book.md` in the same directory.
