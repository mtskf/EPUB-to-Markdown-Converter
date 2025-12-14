# EPUB to Markdown Converter

A simple Node.js tool to convert EPUB files into Markdown.

## Installation

1.  Clone this repository.
2.  Install dependencies and link the command globally:

    ```bash
    npm install
    npm link
    ```

    *   **`npm link`** makes the `epub2md` command available globally on your system. You can then run `epub2md` from any directory.

    ### Alternative

    You can also install it globally directly from the source folder:

    ```bash
    npm install -g .
    ```

## Usage

Run the script with the path to your EPUB file:

```bash
epub2md <path-to-epub> [options]
```

### Options

*   `-o, --output <dir>`: Specify the output directory. Defaults to the input file's directory.
*   `--no-frontmatter`: Disable YAML Frontmatter generation (enabled by default).

Note: The script currently overwrites the output file if it already exists.

## Example

```bash
epub2md my-book.epub -o ./output
```

This will create `my-book.md` in the `./output` directory, and extract images to `./output/assets/`.
