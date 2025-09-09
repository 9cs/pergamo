#!/usr/bin/env python3
"""
Script para filtrar questões do ENEM por disciplina usando IA (Groq API)
Autor: Pergamo
Data: 2024
"""

import os
import json
import requests
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import argparse

# Configuração da API Groq
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

# Mapeamento de áreas para disciplinas
AREA_TO_DISCIPLINES = {
    "ciencias-humanas": ["historia", "geografia", "filosofia", "sociologia"],
    "ciencias-natureza": ["biologia", "quimica", "fisica"],
    "linguagens": ["portugues", "literatura", "artes", "ingles", "espanhol"],
    "matematica": ["matematica"]
}

class QuestionFilter:
    def __init__(self, api_key: str, base_path: str = "."):
        self.api_key = api_key
        self.base_path = Path(base_path)
        self.processed_count = 0
        self.total_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        
        # Rate limiting
        self.request_times = []  # Lista de timestamps das requisições
        self.token_usage = []    # Lista de tokens usados por minuto
        self.max_requests_per_70s = 30
        self.max_tokens_per_minute = 6000
        
        # Sistema de backoff exponencial
        self.consecutive_errors = 0
        self.base_delay = 3  # Delay base em segundos
        self.max_delay = 120    # Delay máximo em segundos
        self.backoff_multiplier = 1.5  # Multiplicador para backoff
        
        # Log de erros
        self.error_log = []
        self.failed_questions = []
        self.log_file = self.base_path / "filter_errors.log"
    
    def _log_error(self, question_path: Path, error_type: str, error_message: str, area: str = None):
        """Registra um erro no log"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        error_entry = {
            "timestamp": timestamp,
            "question_path": str(question_path),
            "error_type": error_type,
            "error_message": error_message,
            "area": area
        }
        self.error_log.append(error_entry)
        self.failed_questions.append(question_path)
        
        # Caminho absoluto para o log (clicável)
        absolute_path = question_path.resolve()
        
        # Salvar no arquivo de log
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {error_type}: {absolute_path} (área: {area})\n")
            f.write(f"  Erro: {error_message}\n\n")
    
    def _save_progress(self, year: int, processed_questions: list):
        """Salva o progresso atual"""
        progress_file = self.base_path / f"progress_{year}.json"
        progress_data = {
            "year": year,
            "processed_questions": processed_questions,
            "timestamp": time.time(),
            "processed_count": self.processed_count,
            "failed_count": self.failed_count,
            "skipped_count": self.skipped_count
        }
        
        with open(progress_file, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, ensure_ascii=False, indent=2)
    
    def _load_progress(self, year: int) -> list:
        """Carrega o progresso salvo"""
        progress_file = self.base_path / f"progress_{year}.json"
        if progress_file.exists():
            try:
                with open(progress_file, 'r', encoding='utf-8') as f:
                    progress_data = json.load(f)
                return progress_data.get("processed_questions", [])
            except Exception as e:
                print(f"⚠️  Erro ao carregar progresso: {e}")
        return []
    
    def _calculate_backoff_delay(self) -> float:
        """Calcula o delay baseado no backoff exponencial"""
        if self.consecutive_errors == 0:
            return self.base_delay
        
        # Fórmula: base_delay * (backoff_multiplier ^ consecutive_errors)
        delay = self.base_delay * (self.backoff_multiplier ** self.consecutive_errors)
        
        # Limitar ao delay máximo
        return min(delay, self.max_delay)
    
    def _reset_backoff(self):
        """Reseta o contador de erros consecutivos"""
        self.consecutive_errors = 0
    
    def _increment_backoff(self):
        """Incrementa o contador de erros consecutivos"""
        self.consecutive_errors += 1
    
    def _clean_old_requests(self):
        """Remove requisições antigas (mais de 70 segundos)"""
        current_time = time.time()
        self.request_times = [t for t in self.request_times if current_time - t < 70]
    
    def _clean_old_tokens(self):
        """Remove tokens antigos (mais de 1 minuto)"""
        current_time = time.time()
        self.token_usage = [(t, tokens) for t, tokens in self.token_usage if current_time - t < 60]
    
    def _can_make_request(self, estimated_tokens: int = 100) -> bool:
        """Verifica se pode fazer uma requisição respeitando os limites"""
        self._clean_old_requests()
        self._clean_old_tokens()
        
        # Verificar limite de requisições (30 a cada 70s)
        if len(self.request_times) >= self.max_requests_per_70s:
            return False
        
        # Verificar limite de tokens (6K por minuto)
        current_tokens = sum(tokens for _, tokens in self.token_usage)
        if current_tokens + estimated_tokens > self.max_tokens_per_minute:
            return False
        
        return True
    
    def _wait_for_rate_limit(self, estimated_tokens: int = 100):
        """Aguarda até poder fazer uma requisição com backoff exponencial"""
        while not self._can_make_request(estimated_tokens):
            # Calcular delay baseado no backoff exponencial
            backoff_delay = self._calculate_backoff_delay()
            
            if len(self.request_times) >= self.max_requests_per_70s:
                # Aguardar até a requisição mais antiga sair da janela de 70s
                oldest_request = min(self.request_times)
                wait_time = max(70 - (time.time() - oldest_request) + 1, backoff_delay)
                print(f"⏳ Aguardando {wait_time:.1f}s para liberar requisições (backoff: {backoff_delay:.1f}s)...")
                time.sleep(wait_time)
            else:
                # Aguardar até liberar tokens
                current_tokens = sum(tokens for _, tokens in self.token_usage)
                wait_time = max(60 - (time.time() - min(t for t, _ in self.token_usage)) + 1, backoff_delay)
                print(f"⏳ Aguardando {wait_time:.1f}s para liberar tokens (backoff: {backoff_delay:.1f}s)...")
                time.sleep(wait_time)
            
            self._clean_old_requests()
            self._clean_old_tokens()
    
    def _record_request(self, tokens_used: int):
        """Registra uma requisição e seus tokens"""
        current_time = time.time()
        self.request_times.append(current_time)
        self.token_usage.append((current_time, tokens_used))
        
    def call_groq_api(self, prompt: str) -> Optional[str]:
        """Chama a API do Groq para classificar a questão"""
        # Estimar tokens (aproximadamente 1 token = 4 caracteres)
        estimated_tokens = len(prompt) // 4 + 100  # +100 para resposta
        
        # Aguardar se necessário
        self._wait_for_rate_limit(estimated_tokens)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 100,
            "temperature": 0.1
        }
        
        try:
            response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
            
            if response.status_code == 429:
                print(f"⚠️  Rate limit atingido. Aplicando backoff exponencial...")
                self._increment_backoff()
                backoff_delay = self._calculate_backoff_delay()
                print(f"⏳ Aguardando {backoff_delay:.1f}s (erro #{self.consecutive_errors})...")
                time.sleep(backoff_delay)
                return None
            
            response.raise_for_status()
            
            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()
            
            # Registrar a requisição e tokens usados
            actual_tokens = result.get("usage", {}).get("total_tokens", estimated_tokens)
            self._record_request(actual_tokens)
            
            # Reset do backoff em caso de sucesso
            if self.consecutive_errors > 0:
                print(f"✅ Sucesso! Resetando backoff (erro #{self.consecutive_errors} → 0)")
                self._reset_backoff()
            
            # Mostrar status do rate limiting
            self._clean_old_requests()
            self._clean_old_tokens()
            remaining_requests = self.max_requests_per_70s - len(self.request_times)
            current_tokens = sum(tokens for _, tokens in self.token_usage)
            remaining_tokens = self.max_tokens_per_minute - current_tokens
            
            print(f"📊 Rate limit: {remaining_requests} reqs restantes, {remaining_tokens} tokens restantes")
            
            return content
            
        except Exception as e:
            print(f"Erro na API: {e}")
            self._increment_backoff()
            backoff_delay = self._calculate_backoff_delay()
            print(f"⏳ Aguardando {backoff_delay:.1f}s antes da próxima tentativa (erro #{self.consecutive_errors})...")
            time.sleep(backoff_delay)
            return None
    
    def build_classification_prompt(self, question: Dict[str, Any], area: str) -> str:
        """Constrói o prompt para classificação da questão"""
        available_disciplines = AREA_TO_DISCIPLINES.get(area, [])
        
        # Construir informações sobre assets
        assets_info = ""
        if question.get("files"):
            assets_info = f"\nIMAGENS/ASSETS: {', '.join(question['files'])}"
        
        # Construir alternativas
        alternatives_text = ""
        if question.get("alternatives"):
            alternatives_text = "\n".join([
                f"{alt['letter']}) {alt['text']}" 
                for alt in question["alternatives"]
            ])
        
        # Mapear área para nome mais claro
        area_names = {
            "ciencias-humanas": "Ciências Humanas e suas Tecnologias",
            "ciencias-natureza": "Ciências da Natureza e suas Tecnologias", 
            "linguagens": "Linguagens, Códigos e suas Tecnologias",
            "matematica": "Matemática e suas Tecnologias"
        }
        
        area_display = area_names.get(area, area)
        
        prompt = f"""Classifique esta questão do ENEM em UMA disciplina específica.

ÁREA: {area}
DISCIPLINAS VÁLIDAS: {', '.join(available_disciplines)}

ENUNCIADO: {question.get('context', '')}
CONTEXTO: {question.get('alternativesIntroduction', '')}
ALTERNATIVAS: {alternatives_text}{assets_info}

REGRAS:
- Responda APENAS o nome da disciplina
- Use apenas: {', '.join(available_disciplines)}
- NÃO explique, NÃO justifique
- Exemplo: "geografia" ou "biologia"

RESPOSTA:"""

        return prompt
    
    def extract_discipline_from_response(self, response: str, available_disciplines: List[str]) -> Optional[str]:
        """Extrai o nome da disciplina da resposta da IA"""
        if not response:
            return None
        
        response = response.lower().strip()
        
        # 1. Procurar por disciplinas válidas na resposta (busca exata)
        for discipline in available_disciplines:
            if discipline in response:
                return discipline
        
        # 2. Procurar por variações comuns
        variations = {
            "quimica": ["química", "quimica"],
            "fisica": ["física", "fisica"],
            "historia": ["história", "historia"],
            "geografia": ["geografia", "geografia"],
            "filosofia": ["filosofia", "filosofia"],
            "sociologia": ["sociologia", "sociologia"],
            "portugues": ["português", "portugues"],
            "literatura": ["literatura", "literatura"],
            "artes": ["arte", "artes"],
            "ingles": ["inglês", "ingles", "english"],
            "espanhol": ["espanhol", "español"],
            "matematica": ["matemática", "matematica", "math"]
        }
        
        for discipline, variants in variations.items():
            if discipline in available_disciplines:
                for variant in variants:
                    if variant in response:
                        return discipline
        
        # 3. Tentar extrair a primeira palavra
        words = response.split()
        if words:
            first_word = words[0].strip('.,!?;:')
            if first_word in available_disciplines:
                return first_word
        
        # 4. Procurar por padrões como "é: disciplina" ou "disciplina."
        for discipline in available_disciplines:
            patterns = [f"é: {discipline}", f"é {discipline}", f"{discipline}."]
            for pattern in patterns:
                if pattern in response:
                    return discipline
        
        return None
    
    def classify_question(self, question: Dict[str, Any], area: str) -> Optional[str]:
        """Classifica uma questão usando IA"""
        # Auto-classificação para matemática (área só tem matemática)
        if area == "matematica":
            print(f"🔢 Auto-classificando matemática (área só tem matemática)")
            return "matematica"
        
        prompt = self.build_classification_prompt(question, area)
        classification = self.call_groq_api(prompt)
        
        if classification:
            available_disciplines = AREA_TO_DISCIPLINES.get(area, [])
            
            # Extrair disciplina da resposta
            extracted_discipline = self.extract_discipline_from_response(classification, available_disciplines)
            
            if extracted_discipline:
                # Validação adicional: verificar se a disciplina faz sentido para a área
                if self._validate_discipline_for_area(extracted_discipline, area):
                    return extracted_discipline
                else:
                    print(f"⚠️  Disciplina inválida para área: {extracted_discipline} (área: {area})")
                    return None
            else:
                print(f"⚠️  Não foi possível extrair disciplina válida da resposta: {classification[:100]}...")
                print(f"    Disciplinas válidas: {', '.join(available_disciplines)}")
                return None
        
        return None
    
    def _validate_discipline_for_area(self, discipline: str, area: str) -> bool:
        """Validação adicional para garantir que a disciplina faz sentido para a área"""
        validation_rules = {
            "ciencias-humanas": ["historia", "geografia", "filosofia", "sociologia"],
            "ciencias-natureza": ["biologia", "quimica", "fisica"],
            "linguagens": ["portugues", "literatura", "artes", "ingles", "espanhol"],
            "matematica": ["matematica"]
        }
        
        valid_disciplines = validation_rules.get(area, [])
        return discipline in valid_disciplines
    
    def _reorder_json_keys(self, question_data: Dict[str, Any], area: str, discipline: str) -> Dict[str, Any]:
        """Reordena as keys do JSON para colocar 'area' antes de 'discipline'"""
        # Remover as keys antigas se existirem
        question_data.pop("area", None)
        question_data.pop("discipline", None)
        
        # Criar novo dicionário com ordem correta
        reordered = {}
        
        # Adicionar keys na ordem desejada
        for key in ["title", "index", "year", "language"]:
            if key in question_data:
                reordered[key] = question_data[key]
        
        # Adicionar area e discipline
        reordered["area"] = area
        reordered["discipline"] = discipline
        
        # Adicionar o resto das keys
        for key, value in question_data.items():
            if key not in reordered:
                reordered[key] = value
        
        return reordered
    
    def process_question_file(self, question_path: Path, area: str) -> bool:
        """Processa um arquivo de questão individual"""
        try:
            with open(question_path, 'r', encoding='utf-8') as f:
                question_data = json.load(f)
            
            # Verificar se já foi processada
            if "area" in question_data and "discipline" in question_data:
                print(f"⏭️  {question_path.name}: Já processada ({question_data['area']} → {question_data['discipline']})")
                self.skipped_count += 1
                return True
            
            # Classificar a questão
            discipline = self.classify_question(question_data, area)
            
            if discipline:
                # Validação final antes de salvar
                if self._validate_discipline_for_area(discipline, area):
                    # Reordenar o JSON para colocar "area" antes de "discipline"
                    reordered_data = self._reorder_json_keys(question_data, area, discipline)
                    
                    # Salvar o arquivo atualizado
                    with open(question_path, 'w', encoding='utf-8') as f:
                        json.dump(reordered_data, f, ensure_ascii=False, indent=4)
                    
                    print(f"✅ {question_path.name}: {area} → {discipline}")
                    return True
                else:
                    error_msg = f"Validação final falhou ({area} → {discipline})"
                    print(f"❌ {question_path.name}: {error_msg}")
                    self._log_error(question_path, "VALIDATION_ERROR", error_msg, area)
                    self.failed_count += 1
                    return False
            else:
                error_msg = "Falha na classificação da IA"
                print(f"❌ {question_path.name}: {error_msg}")
                self._log_error(question_path, "CLASSIFICATION_ERROR", error_msg, area)
                self.failed_count += 1
                return False
                
        except Exception as e:
            error_msg = f"Erro ao processar arquivo: {str(e)}"
            print(f"❌ Erro ao processar {question_path}: {e}")
            self._log_error(question_path, "FILE_ERROR", error_msg, area)
            self.failed_count += 1
            return False
    
    def process_year(self, year: int, retry_failed: bool = False, start_question: int = None) -> None:
        """Processa todas as questões de um ano"""
        year_path = self.base_path / "year" / str(year)
        
        if not year_path.exists():
            print(f"❌ Diretório do ano {year} não encontrado")
            return
        
        # Carregar o arquivo principal do ano
        year_file = year_path / "details.json"
        if not year_file.exists():
            print(f"❌ Arquivo details.json não encontrado para {year}")
            return
        
        with open(year_file, 'r', encoding='utf-8') as f:
            year_data = json.load(f)
        
        print(f"\n📅 Processando ENEM {year}...")
        
        # Carregar progresso anterior
        processed_questions = self._load_progress(year) if not retry_failed else []
        
        # Processar cada questão
        questions = year_data.get("questions", [])
        self.total_count = len(questions)
        
        # Se start_question foi especificado, pular questões iniciais
        if start_question:
            print(f"🎯 Começando a partir da questão {start_question}")
            questions = [q for q in questions if q.get("index", 0) >= start_question]
            print(f"📊 Questões restantes: {len(questions)}")
            # Atualizar total_count para refletir apenas as questões que serão processadas
            self.total_count = len(questions)
        
        for i, question_info in enumerate(questions, 1):
            area = question_info.get("discipline")  # discipline atual é na verdade a área
            language = question_info.get("language")
            question_index = question_info.get("index")
            
            if not area or not question_index:
                print(f"⚠️  Questão {i} sem área ou índice")
                continue
            
            # Determinar o caminho da questão
            if language:
                # Questão de língua estrangeira
                question_folder = f"{question_index}-{language}"
            else:
                # Questão normal
                question_folder = str(question_index)
            
            question_path = year_path / "questions" / question_folder / "details.json"
            
            # Verificar se já foi processada (exceto se for retry)
            if not retry_failed and str(question_path) in processed_questions:
                print(f"⏭️  Questão {question_index}: Já processada anteriormente")
                self.skipped_count += 1
                continue
            
            if question_path.exists():
                # Mostrar contador correto e índice da questão
                if start_question:
                    print(f"[{i}/{self.total_count}] Processando questão {question_index} (iniciado da {start_question})...")
                else:
                    print(f"[{i}/{self.total_count}] Processando questão {question_index}...")
                
                success = self.process_question_file(question_path, area)
                if success:
                    self.processed_count += 1
                    processed_questions.append(str(question_path))
                    
                    # Salvar progresso a cada 10 questões
                    if self.processed_count % 10 == 0:
                        self._save_progress(year, processed_questions)
            else:
                print(f"⚠️  Arquivo não encontrado: {question_path}")
                self._log_error(question_path, "FILE_NOT_FOUND", "Arquivo não encontrado", area)
                self.failed_count += 1
        
        # Salvar progresso final
        self._save_progress(year, processed_questions)
        
        print(f"\n✅ Processamento do {year} concluído!")
        print(f"📊 Questões processadas: {self.processed_count}")
        print(f"📊 Questões puladas: {self.skipped_count}")
        print(f"📊 Questões com erro: {self.failed_count}")
        print(f"📊 Total: {self.processed_count + self.skipped_count + self.failed_count}/{self.total_count}")
        
        if self.failed_count > 0:
            print(f"📝 Log de erros salvo em: {self.log_file}")
            print(f"💡 Para tentar novamente as questões com erro, use: --retry-failed")
    
    def retry_failed_questions(self, year: int = None, start_question: int = None) -> None:
        """Tenta processar novamente as questões que falharam"""
        print("🔄 Tentando processar novamente questões com erro...")
        
        # Carregar questões com erro do log
        failed_questions = self._load_failed_questions_from_log()
        
        if not failed_questions:
            print("✅ Nenhuma questão com erro encontrada no log!")
            return
        
        # Filtrar por ano se especificado
        if year:
            failed_questions = [q for q in failed_questions if year in str(q)]
            if not failed_questions:
                print(f"✅ Nenhuma questão com erro encontrada para o ano {year}!")
                return
        
        print(f"📊 Encontradas {len(failed_questions)} questões com erro para reprocessar")
        
        # Processar cada questão com erro
        for i, question_path in enumerate(failed_questions, 1):
            question_path = Path(question_path)
            
            if not question_path.exists():
                print(f"⚠️  Arquivo não encontrado: {question_path}")
                continue
            
            # Carregar a questão para obter a área
            try:
                with open(question_path, 'r', encoding='utf-8') as f:
                    question_data = json.load(f)
                
                # Tentar obter área (pode ser "area" ou "discipline" original)
                area = question_data.get("area") or question_data.get("discipline")
                if not area:
                    print(f"⚠️  Questão sem área definida: {question_path}")
                    continue
                
                # Extrair o ano e o número da questão do caminho do arquivo
                try:
                    # Exemplo de caminho: .../year/2018/questions/115/details.json
                    parts = question_path.parts
                    year = next((p for i, p in enumerate(parts) if p == "year" and i + 1 < len(parts)), None)
                    if year:
                        year_index = parts.index("year") + 1
                        year_value = parts[year_index]
                    else:
                        year_value = "?"
                    # Procurar o número da questão
                    if "questions" in parts:
                        q_index = parts.index("questions") + 1
                        question_number = parts[q_index]
                    else:
                        question_number = "?"
                except Exception:
                    year_value = "?"
                    question_number = "?"
                print(f"[{i}/{len(failed_questions)}] Reprocessando questão {question_number} do ano {year_value} ({question_path.name})...")
                
                success = self.process_question_file(question_path, area)
                if success:
                    self.processed_count += 1
                    print(f"✅ {question_path.name}: {area} → {question_data.get('discipline', 'N/A')}")
                    # Remover questão do log de erros após sucesso
                    self._remove_question_from_error_log(question_path)
                else:
                    print(f"❌ {question_path.name}: Falha novamente")
                
            except Exception as e:
                print(f"❌ Erro ao carregar {question_path}: {e}")
        
        print(f"\n✅ Retry concluído!")
        print(f"📊 Questões reprocessadas: {self.processed_count}/{len(failed_questions)}")
        
        # Mostrar estatísticas do log após retry
        self._show_log_statistics()
    
    def _remove_question_from_error_log(self, question_path: Path):
        """Remove uma questão específica do log de erros após processamento bem-sucedido"""
        if not self.log_file.exists():
            return
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Filtrar linhas que não contêm o caminho da questão
            filtered_lines = []
            removed_count = 0
            
            for line in lines:
                # Verificar se a linha contém o caminho da questão
                if str(question_path) in line:
                    removed_count += 1
                    continue  # Pular esta linha (remover)
                filtered_lines.append(line)
            
            # Reescrever o arquivo sem as linhas removidas
            if removed_count > 0:
                with open(self.log_file, 'w', encoding='utf-8') as f:
                    f.writelines(filtered_lines)
                
                if os.environ.get('NODE_ENV') == 'development':
                    print(f"🗑️  Removidas {removed_count} entradas do log para {question_path.name}")
        
        except Exception as e:
            if os.environ.get('NODE_ENV') == 'development':
                print(f"⚠️  Erro ao remover do log: {e}")
    
    def _show_log_statistics(self):
        """Mostra estatísticas do log de erros"""
        if not self.log_file.exists():
            print("📋 Log de erros: vazio")
            return
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Contar entradas de erro
            error_entries = content.count('[CLASSIFICATION_ERROR]')
            warning_entries = content.count('⚠️')
            
            print(f"📋 Log de erros atualizado:")
            print(f"   • Erros de classificação: {error_entries}")
            print(f"   • Avisos: {warning_entries}")
            
            if error_entries == 0:
                print("   🎉 Nenhum erro restante no log!")
            else:
                print(f"   ⚠️  {error_entries} questões ainda com erro")
        
        except Exception as e:
            print(f"⚠️  Erro ao ler estatísticas do log: {e}")
    
    def _load_failed_questions_from_log(self) -> list:
        """Carrega as questões com erro do arquivo de log"""
        failed_questions = []
        
        if not self.log_file.exists():
            return failed_questions
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Dividir por linhas de timestamp para processar cada entrada
            entries = content.split('\n[')
            if entries[0].startswith('['):
                entries[0] = entries[0][1:]  # Remover [ inicial da primeira entrada
            
            for entry in entries:
                if not entry.strip():
                    continue
                
                # Adicionar [ de volta se não tiver
                if not entry.startswith('['):
                    entry = '[' + entry
                
                # Procurar por tipos de erro
                if any(error_type in entry for error_type in ["CLASSIFICATION_ERROR:", "VALIDATION_ERROR:", "FILE_ERROR:"]):
                    # Extrair o caminho da questão usando regex mais robusta
                    import re
                    
                    # Padrão para extrair o caminho completo
                    pattern = r'(CLASSIFICATION_ERROR|VALIDATION_ERROR|FILE_ERROR):\s+(.+?)\s+\(área:'
                    match = re.search(pattern, entry)
                    
                    if match:
                        question_path = match.group(2).strip()
                        # Verificar se é um caminho válido
                        if question_path and ('year' in question_path and 'questions' in question_path):
                            failed_questions.append(question_path)
            
            # Remover duplicatas mantendo ordem
            seen = set()
            unique_questions = []
            for q in failed_questions:
                if q not in seen:
                    seen.add(q)
                    unique_questions.append(q)
            
            return unique_questions
            
        except Exception as e:
            print(f"⚠️  Erro ao ler log de erros: {e}")
            return []
    
    def show_error_summary(self) -> None:
        """Mostra um resumo dos erros encontrados"""
        if not self.error_log:
            print("✅ Nenhum erro encontrado!")
            return
        
        print(f"\n📊 Resumo de erros ({len(self.error_log)} total):")
        
        # Agrupar por tipo de erro
        error_types = {}
        for error in self.error_log:
            error_type = error["error_type"]
            if error_type not in error_types:
                error_types[error_type] = []
            error_types[error_type].append(error)
        
        for error_type, errors in error_types.items():
            print(f"\n  {error_type}: {len(errors)} erros")
            for error in errors[:3]:  # Mostrar apenas os primeiros 3
                print(f"    - {error['question_path']} (área: {error['area']})")
            if len(errors) > 3:
                print(f"    ... e mais {len(errors) - 3} erros")
        
        print(f"\n📝 Log completo salvo em: {self.log_file}")
    
    def process_all_years(self) -> None:
        """Processa todos os anos disponíveis"""
        years_path = self.base_path / "year"
        
        if not years_path.exists():
            print("❌ Diretório 'year' não encontrado")
            return
        
        # Encontrar todos os anos
        years = []
        for item in years_path.iterdir():
            if item.is_dir() and item.name.isdigit():
                years.append(int(item.name))
        
        years.sort()
        
        print(f"📚 Anos encontrados: {years}")
        
        for year in years:
            self.process_year(year)
            print(f"\n{'='*50}")
    
    def check_all_questions(self) -> None:
        """Verifica todas as questões para validar discipline, area e mapeamentos"""
        print("\n🔍 Verificando todas as questões...")
        
        years_path = self.base_path / "year"
        validation_errors = []
        missing_area = []
        missing_discipline = []
        invalid_mapping = []
        file_errors = []
        
        total_questions = 0
        valid_questions = 0
        
        # Estatísticas por área
        area_stats = {}
        discipline_stats = {}
        
        for year_dir in years_path.iterdir():
            if not year_dir.is_dir() or not year_dir.name.isdigit():
                continue
            
            year = int(year_dir.name)
            print(f"📅 Verificando {year}...")
            
            year_questions = 0
            year_valid = 0
            
            for question_dir in (year_dir / "questions").iterdir():
                if not question_dir.is_dir():
                    continue
                
                question_file = question_dir / "details.json"
                if not question_file.exists():
                    continue
                
                total_questions += 1
                year_questions += 1
                
                try:
                    with open(question_file, 'r', encoding='utf-8') as f:
                        question_data = json.load(f)
                    
                    area = question_data.get("area")
                    discipline = question_data.get("discipline")
                    
                    # Verificar se tem área
                    if not area:
                        missing_area.append(f"{question_file}: Sem área definida")
                        continue
                    
                    # Verificar se tem disciplina
                    if not discipline:
                        missing_discipline.append(f"{question_file}: Sem disciplina definida (área: {area})")
                        continue
                    
                    # Verificar se a disciplina é válida para a área
                    valid_disciplines = AREA_TO_DISCIPLINES.get(area, [])
                    if discipline not in valid_disciplines:
                        invalid_mapping.append(
                            f"{question_file}: Disciplina '{discipline}' inválida para área '{area}' "
                            f"(válidas: {', '.join(valid_disciplines)})"
                        )
                        continue
                    
                    # Questão válida
                    valid_questions += 1
                    year_valid += 1
                    
                    # Atualizar estatísticas
                    area_stats[area] = area_stats.get(area, 0) + 1
                    discipline_stats[discipline] = discipline_stats.get(discipline, 0) + 1
                
                except Exception as e:
                    file_errors.append(f"{question_file}: Erro ao ler - {e}")
            
            print(f"   ✅ {year}: {year_valid}/{year_questions} questões válidas")
        
        # Relatório final
        print(f"\n📊 RELATÓRIO DE VERIFICAÇÃO")
        print(f"{'='*50}")
        print(f"📈 Total de questões verificadas: {total_questions}")
        print(f"✅ Questões válidas: {valid_questions}")
        print(f"❌ Questões com problemas: {total_questions - valid_questions}")
        
        # Problemas encontrados
        if missing_area:
            print(f"\n🚫 Questões sem área ({len(missing_area)}):")
            for error in missing_area[:5]:
                print(f"   - {error}")
            if len(missing_area) > 5:
                print(f"   ... e mais {len(missing_area) - 5} questões")
        
        if missing_discipline:
            print(f"\n🚫 Questões sem disciplina ({len(missing_discipline)}):")
            for error in missing_discipline[:5]:
                print(f"   - {error}")
            if len(missing_discipline) > 5:
                print(f"   ... e mais {len(missing_discipline) - 5} questões")
        
        if invalid_mapping:
            print(f"\n🚫 Mapeamentos inválidos ({len(invalid_mapping)}):")
            for error in invalid_mapping[:5]:
                print(f"   - {error}")
            if len(invalid_mapping) > 5:
                print(f"   ... e mais {len(invalid_mapping) - 5} questões")
        
        if file_errors:
            print(f"\n🚫 Erros de arquivo ({len(file_errors)}):")
            for error in file_errors[:5]:
                print(f"   - {error}")
            if len(file_errors) > 5:
                print(f"   ... e mais {len(file_errors) - 5} erros")
        
        # Estatísticas por área
        if area_stats:
            print(f"\n📊 QUESTÕES POR ÁREA:")
            for area, count in sorted(area_stats.items()):
                print(f"   {area}: {count} questões")
        
        # Estatísticas por disciplina
        if discipline_stats:
            print(f"\n📊 QUESTÕES POR DISCIPLINA:")
            for discipline, count in sorted(discipline_stats.items()):
                print(f"   {discipline}: {count} questões")
        
        # Validação de mapeamentos específicos
        print(f"\n🔍 VALIDAÇÃO DE MAPEAMENTOS:")
        self._validate_specific_mappings()
        
        # Salvar relatório detalhado
        self._save_validation_report({
            'total_questions': total_questions,
            'valid_questions': valid_questions,
            'missing_area': missing_area,
            'missing_discipline': missing_discipline,
            'invalid_mapping': invalid_mapping,
            'file_errors': file_errors,
            'area_stats': area_stats,
            'discipline_stats': discipline_stats
        })
        
        if total_questions == valid_questions:
            print(f"\n🎉 TODAS AS QUESTÕES ESTÃO VÁLIDAS!")
        else:
            print(f"\n⚠️  {total_questions - valid_questions} questões precisam de correção")
    
    def _validate_specific_mappings(self) -> None:
        """Valida mapeamentos específicos mencionados pelo usuário"""
        print("   Verificando mapeamentos específicos...")
        
        # Mapeamentos que devem ser válidos
        expected_mappings = {
            "linguagens": ["ingles", "espanhol", "portugues", "literatura", "artes"],
            "ciencias-natureza": ["fisica", "quimica", "biologia"],
            "ciencias-humanas": ["historia", "geografia", "filosofia", "sociologia"],
            "matematica": ["matematica"]
        }
        
        years_path = self.base_path / "year"
        mapping_issues = []
        
        for year_dir in years_path.iterdir():
            if not year_dir.is_dir() or not year_dir.name.isdigit():
                continue
            
            for question_dir in (year_dir / "questions").iterdir():
                if not question_dir.is_dir():
                    continue
                
                question_file = question_dir / "details.json"
                if not question_file.exists():
                    continue
                
                try:
                    with open(question_file, 'r', encoding='utf-8') as f:
                        question_data = json.load(f)
                    
                    area = question_data.get("area")
                    discipline = question_data.get("discipline")
                    
                    if not area or not discipline:
                        continue
                    
                    # Verificar mapeamentos específicos
                    if area in expected_mappings:
                        valid_disciplines = expected_mappings[area]
                        if discipline not in valid_disciplines:
                            mapping_issues.append(f"{question_file}: {discipline} não deveria estar em {area}")
                
                except Exception:
                    continue
        
        if mapping_issues:
            print(f"   ❌ {len(mapping_issues)} mapeamentos incorretos encontrados:")
            for issue in mapping_issues[:3]:
                print(f"      - {issue}")
            if len(mapping_issues) > 3:
                print(f"      ... e mais {len(mapping_issues) - 3}")
        else:
            print("   ✅ Todos os mapeamentos específicos estão corretos")
    
    def _save_validation_report(self, report_data: dict) -> None:
        """Salva relatório detalhado de validação"""
        report_file = self.base_path / "validation_report.json"
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2)
            print(f"\n📄 Relatório detalhado salvo em: {report_file}")
        except Exception as e:
            print(f"⚠️  Erro ao salvar relatório: {e}")

    def validate_classifications(self) -> None:
        """Valida as classificações feitas (função original mantida para compatibilidade)"""
        print("\n🔍 Validando classificações...")
        
        years_path = self.base_path / "year"
        validation_errors = []
        
        for year_dir in years_path.iterdir():
            if not year_dir.is_dir() or not year_dir.name.isdigit():
                continue
            
            year = int(year_dir.name)
            print(f"Validando {year}...")
            
            for question_dir in (year_dir / "questions").iterdir():
                if not question_dir.is_dir():
                    continue
                
                question_file = question_dir / "details.json"
                if not question_file.exists():
                    continue
                
                try:
                    with open(question_file, 'r', encoding='utf-8') as f:
                        question_data = json.load(f)
                    
                    area = question_data.get("area")
                    discipline = question_data.get("discipline")
                    
                    if not area or not discipline:
                        validation_errors.append(f"{question_file}: Sem área ou disciplina")
                        continue
                    
                    # Verificar se a disciplina é válida para a área
                    valid_disciplines = AREA_TO_DISCIPLINES.get(area, [])
                    if discipline not in valid_disciplines:
                        validation_errors.append(
                            f"{question_file}: Disciplina '{discipline}' inválida para área '{area}'"
                        )
                
                except Exception as e:
                    validation_errors.append(f"{question_file}: Erro ao ler - {e}")
        
        if validation_errors:
            print(f"\n❌ {len(validation_errors)} erros encontrados:")
            for error in validation_errors[:10]:  # Mostrar apenas os primeiros 10
                print(f"  - {error}")
            if len(validation_errors) > 10:
                print(f"  ... e mais {len(validation_errors) - 10} erros")
        else:
            print("✅ Todas as classificações estão válidas!")

def main():
    parser = argparse.ArgumentParser(description="Filtrar questões do ENEM por disciplina usando IA")
    parser.add_argument("--api-key", help="Chave da API do Groq (obrigatória apenas para processamento)")
    parser.add_argument("--year", type=int, help="Processar apenas um ano específico")
    parser.add_argument("--validate", action="store_true", help="Apenas validar classificações existentes")
    parser.add_argument("--check-all", action="store_true", help="Verificar todas as questões e validar discipline/area")
    parser.add_argument("--retry-failed", action="store_true", help="Tentar novamente questões que falharam")
    parser.add_argument("--show-errors", action="store_true", help="Mostrar resumo de erros")
    parser.add_argument("--start-question", type=int, help="Começar a partir de uma questão específica (ex: 105)")
    parser.add_argument("--base-path", default=".", help="Caminho base dos arquivos")
    
    args = parser.parse_args()
    
    # Inicializar o filtro (API key só é necessária para processamento)
    api_key = args.api_key or "dummy_key"  # Para modos que não precisam de API
    filter_tool = QuestionFilter(api_key, args.base_path)
    
    if args.check_all:
        # Verificar todas as questões
        filter_tool.check_all_questions()
    elif args.validate:
        # Apenas validar
        filter_tool.validate_classifications()
    elif args.retry_failed:
        # Verificar se API key foi fornecida para retry
        if not args.api_key:
            print("❌ Chave da API do Groq é obrigatória para --retry-failed")
            print("Use: python filter_questions_ai.py --api-key SUA_CHAVE_AQUI --retry-failed")
            return
        # Tentar novamente questões com erro
        filter_tool.retry_failed_questions(args.year, args.start_question)
    elif args.show_errors:
        # Mostrar resumo de erros
        filter_tool.show_error_summary()
    elif args.year:
        # Verificar se API key foi fornecida para processamento
        if not args.api_key:
            print("❌ Chave da API do Groq é obrigatória para processamento")
            print("Use: python filter_questions_ai.py --api-key SUA_CHAVE_AQUI --year 2009")
            return
        # Processar ano específico
        filter_tool.process_year(args.year, start_question=args.start_question)
    else:
        # Verificar se API key foi fornecida para processamento
        if not args.api_key:
            print("❌ Chave da API do Groq é obrigatória para processamento")
            print("Use: python filter_questions_ai.py --api-key SUA_CHAVE_AQUI")
            print("   Ou use --check-all para apenas verificar questões existentes")
            return
        # Processar todos os anos
        if args.start_question:
            print(f"⚠️  --start-question só funciona com --year")
            print("   Use: python filter_questions_ai.py --api-key SUA_CHAVE --year 2009 --start-question 105")
            return
        filter_tool.process_all_years()
    
    print(f"\n🎉 Processo concluído!")
    print(f"📊 Total de questões processadas: {filter_tool.processed_count}")
    print(f"📊 Total de questões puladas: {filter_tool.skipped_count}")
    print(f"📊 Total de questões com erro: {filter_tool.failed_count}")
    
    if filter_tool.failed_count > 0:
        print(f"\n💡 Para tentar novamente as questões com erro:")
        print(f"   python filter_questions_ai.py --api-key SUA_CHAVE --retry-failed")
        print(f"   python filter_questions_ai.py --api-key SUA_CHAVE --show-errors")
    
    print(f"\n💡 Outros comandos úteis:")
    print(f"   python filter_questions_ai.py --check-all  # Verificar todas as questões")
    print(f"   python filter_questions_ai.py --validate   # Validar classificações")

if __name__ == "__main__":
    main()
