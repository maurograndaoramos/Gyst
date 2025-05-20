FROM python:3.10.12

WORKDIR /backend

COPY . .

RUN pip install poetry

RUN poetry install

EXPOSE 8000

CMD ["poetry", "run", "python", "main.py"] 