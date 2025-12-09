#!/bin/bash

echo "Setting up git hooks..."

if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Please install uv first."
    exit 1
fi

# Install pre-commit (from back/ where pre-commit is installed)
cd back && uv run pre-commit install && cd ..

# Make custom hooks executable
chmod +x .githooks/prepare-commit-msg
chmod +x .githooks/commit-msg

# Copy custom hooks to .git/hooks/
cp .githooks/prepare-commit-msg .git/hooks/prepare-commit-msg
cp .githooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/prepare-commit-msg
chmod +x .git/hooks/commit-msg

echo "✓ Git hooks configured successfully"
echo ""
echo "Setup complete! Your commits will now:"
echo "  1. Run basic pre-commit checks"
echo "  2. Prepend issue numbers from branch names"
echo "  3. Reject duplicate commit messages"