# -*- coding: utf-8 -*-
"""
Processa questões ENEM (2009-2023):
- Limpa URLs de imagens em `context` -> substitui por [imagem]
- Em `files`, mantém só o nome do arquivo
- Classifica a disciplina via meta-llama/llama-guard-4-12b (OpenRouter)
- Move 'discipline' antigo para 'area' e grava nova 'discipline'
- Adiciona prompt otimizado para questões do ENEM
- Inclui modo de teste (pega 10 questões aleatórias para validar a classificação)

Requisitos:
    pip install requests

Antes de rodar:
    setx OPENROUTER_API_KEY "sua_chave_aqui"   # no Windows (novo terminal depois)
"""

import os
import json
import time
import random
import re
import requests
from urllib.parse import urlparse
from collections import OrderedDict

# ====== CONFIG ======
BASE_DIR = r"C:\Users\user\Documents\enem\public"
ANOS = list(range(2009, 2024))  # 2009..2023 inclusive
RATE_LIMIT_SECONDS = 1.5
RETRIES = 3
ERROS_ARQ = "erros_materias.txt"

# Modelo / provedor (OpenRouter)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_ID = "meta-llama/llama-3.3-70b-instruct"
OPENROUTER_API_KEY = "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"

MATERIAS_VALIDAS = [
    "portugues", "literatura", "matematica", "historia", "geografia",
    "filosofia", "ingles", "espanhol", "biologia", "fisica", "quimica",
    "sociologia", "artes"
]
NORMALIZACAO_MATERIAS = {
    "arte": "artes",
    "artes": "artes",
    "sociedade": "sociologia",
    "sociologia": "sociologia",
    "economia": "matematica",
    "matematica": "matematica",
    "lingua portuguesa": "portugues",
    "português": "portugues",
    "ingles": "ingles",
    "inglês": "ingles",
    "espanhol": "espanhol",
}

IMG_MD_PATTERN = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')  # ![alt](URL)

# -------- Funções utilitárias --------
def debug_print(msg):
    print(msg, flush=True)

def basename_from_url(url_or_path: str) -> str:
    try:
        parsed = urlparse(url_or_path)
        path = parsed.path if parsed.scheme else url_or_path
        return os.path.basename(path)
    except Exception:
        return os.path.basename(url_or_path)

def sanitize_context(context: str) -> str:
    """Troca qualquer ![](URL) por [imagem]."""
    if not isinstance(context, str) or not context.strip():
        return context

    def _replace(m):
        return "[imagem]"

    sanitized = re.sub(IMG_MD_PATTERN, _replace, context)
    return sanitized

def normalize_files(files):
    """Mantém apenas os nomes de arquivo em 'files'."""
    if not isinstance(files, list):
        return files
    out = []
    for f in files:
        if not isinstance(f, str):
            continue
        out.append(basename_from_url(f))
    # dedup
    seen, dedup = set(), []
    for f in out:
        if f not in seen:
            dedup.append(f)
            seen.add(f)
    return dedup

def normalizar_materia(materia: str):
    if not materia:
        return None
    materia = materia.strip().lower()
    if materia in NORMALIZACAO_MATERIAS:
        materia = NORMALIZACAO_MATERIAS[materia]
    return materia if materia in MATERIAS_VALIDAS else None

# -------- Prompt para o ENEM --------
def build_prompt(contexto: str, alternativas: list) -> str:
    alternativas_texto = ""
    if isinstance(alternativas, list):
        for alt in alternativas:
            letra = (alt or {}).get("letter", "")
            texto = (alt or {}).get("text", "")
            alternativas_texto += f"\nAlternativa {letra}: {texto}"

    ctx = (contexto or "") + alternativas_texto

    prompt = (
        "Você é um classificador de questões do ENEM (Exame Nacional do Ensino Médio, Brasil), "
        "que vai de 2009 até 2023.\n"
        "Seu trabalho é analisar o enunciado e as alternativas e decidir a disciplina **oficial** "
        "à qual a questão pertence. Mesmo que uma questão tenha conteúdo interdisciplinar, "
        "classifique pela disciplina principal que o ENEM/INEP atribuiria.\n\n"
        "Regras importantes:\n"
        "- Biologia: seres vivos, genética, ecologia, evolução, fisiologia.\n"
        "- Química: reações químicas, substâncias, ligações, estequiometria, equilíbrio.\n"
        "- Física: movimento, energia, eletricidade, óptica, ondas.\n"
        "- Matemática: cálculos, álgebra, geometria, estatística, probabilidade.\n"
        "- Português/Literatura: interpretação de texto, gramática, análise literária.\n"
        "- História: fatos históricos, sociedades antigas, revoluções, Brasil Colônia/Império.\n"
        "- Geografia: espaço, território, mapas, clima, globalização.\n"
        "- Filosofia/Sociologia: correntes filosóficas, autores, sociedade, cidadania.\n"
        "- Artes: artes visuais, música, teatro.\n"
        "- Inglês/Espanhol: interpretação de textos em língua estrangeira.\n\n"
        "IMPORTANTE: responda **apenas com uma palavra minúscula sem acento**, escolhendo "
        "entre: portugues, literatura, matematica, historia, geografia, filosofia, ingles, espanhol, "
        "biologia, fisica, quimica, sociologia, artes.\n\n"
        f"Enunciado e alternativas:\n{ctx}\n\n"
        "Materia:"
    )
    return prompt

# -------- Chamada ao modelo --------
def call_model(prompt: str, retries: int = RETRIES, temperature: float = 0.0, timeout: int = 30) -> str:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("Defina a variável de ambiente OPENROUTER_API_KEY.")

    payload = {
        "model": MODEL_ID,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": 32
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    last_err = None
    for i in range(retries):
        try:
            r = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                return (data["choices"][0]["message"]["content"] or "").strip()
            last_err = RuntimeError(f"API {r.status_code}: {r.text[:300]}")
        except Exception as e:
            last_err = e
        time.sleep(RATE_LIMIT_SECONDS + random.uniform(0, 0.8))
    raise last_err

def classificar_materia(contexto: str, alternativas: list) -> str:
    prompt = build_prompt(contexto, alternativas)
    raw = call_model(prompt)
    materia = normalizar_materia(raw)
    return materia

# -------- Manipulação JSON --------
def reordenar_campos(dados: dict, materia: str, area_antiga: str | None):
    novo = OrderedDict()
    inserted = False
    for k in list(dados.keys()):
        novo[k] = dados[k]
        if k == "year" and not inserted:
            # se existir language (mesmo que seja null), copia
            if "language" in dados:
                novo["language"] = dados.get("language")
            if area_antiga:
                novo["area"] = area_antiga
            novo["discipline"] = materia
            inserted = True
    # agora copia qualquer chave que não entrou
    for k, v in dados.items():
        if k not in novo:
            novo[k] = v
    return novo

def processar_questao(questao_path: str):
    with open(questao_path, "r", encoding="utf-8") as f:
        dados = json.load(f)

    contexto = dados.get("context", "")
    dados["context"] = sanitize_context(contexto)

    if "files" in dados:
        dados["files"] = normalize_files(dados.get("files", []))

    alternativas = dados.get("alternatives", [])

    area_antiga = None
    if "discipline" in dados:
        area_antiga = dados["discipline"]
        dados.pop("discipline", None)

    materia = classificar_materia(dados.get("context", ""), alternativas)

    if materia:
        dados_ordenados = reordenar_campos(dados, materia, area_antiga)
        with open(questao_path, "w", encoding="utf-8") as f:
            json.dump(dados_ordenados, f, ensure_ascii=False, indent=2)
        return True, materia
    else:
        with open(questao_path, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
        return False, None

# -------- MAIN --------
def main(modo_teste=False):
    contador = 0
    testes = []

    with open(ERROS_ARQ, "w", encoding="utf-8") as flog:
        for ano in ANOS:
            questions_dir = os.path.join(BASE_DIR, str(ano), "questions")
            if not os.path.isdir(questions_dir):
                continue

            try:
                subpastas = sorted(os.listdir(questions_dir), key=lambda s: int(s))
            except Exception:
                subpastas = sorted(os.listdir(questions_dir))

            for sub in subpastas:
                questao_path = os.path.join(questions_dir, sub, "details.json")
                if not os.path.isfile(questao_path):
                    continue
                try:
                    ok, materia = processar_questao(questao_path)
                    if ok:
                        debug_print(f"[+] Questão {sub} ({ano}) - Matéria: {materia}")
                        if modo_teste and len(testes) < 10:
                            testes.append((ano, sub, materia))
                    else:
                        msg = f"[-] Questão {sub} ({ano}) - Erro: matéria não identificada"
                        debug_print(msg)
                        flog.write(msg + "\n")
                        flog.flush()
                except Exception as e:
                    msg = f"[-] Questão {sub} ({ano}) - Erro: {e}"
                    debug_print(msg)
                    flog.write(msg + "\n")
                    flog.flush()
                finally:
                    contador += 1
                    if not modo_teste:
                        if contador % 100 == 0:
                            debug_print(f"{contador} questões processadas...")
                        time.sleep(RATE_LIMIT_SECONDS)

                if modo_teste and len(testes) >= 10:
                    break
            if modo_teste and len(testes) >= 10:
                break

    if modo_teste:
        debug_print("\n=== RESULTADOS DO MODO TESTE ===")
        for ano, sub, mat in testes:
            print(f"Ano {ano}, Questão {sub} -> {mat}")
    else:
        debug_print("Processamento finalizado.")

if __name__ == "__main__":
    main(modo_teste=False)