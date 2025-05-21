FROM python:3.10.12

WORKDIR /backend

COPY . .

# Install uv package manager
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH
ENV PATH="/root/.local/bin:${PATH}"

# # Create a virtual environment and install dependencies
# RUN uv venv .venv
# ENV PATH="/backend/.venv/bin:${PATH}"

# Install dependencies using uv pip
RUN uv pip install -e .

EXPOSE 8000

# Run the FastAPI application using the backend module
CMD ["python", "-m", "backend"] 