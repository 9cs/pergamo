#!/usr/bin/env python3
"""
Script auxiliar para executar o filtro de questões
"""

import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Executar filtro de questões do ENEM")
    parser.add_argument("--year", type=int, help="Processar apenas um ano específico")
    parser.add_argument("--year-range", help="Processar um intervalo de anos (ex: 2009-2023)")
    parser.add_argument("--start-question", type=int, help="Começar a partir de uma questão específica (ex: 105)")
    parser.add_argument("--retry-failed", action="store_true", help="Tentar novamente questões que falharam")
    parser.add_argument("--show-errors", action="store_true", help="Mostrar resumo de erros")
    parser.add_argument("--validate", action="store_true", help="Apenas validar classificações existentes")
    
    args = parser.parse_args()
    
    if not Path("year").exists():
        print("❌ Execute este script no diretório 'public'")
        print("   cd public")
        print("   python run_filter.py")
        return
    
    api_key = "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"
    if not api_key:
        print("❌ Variável de ambiente GROQ_API_KEY não encontrada")
        print("   Configure com: set GROQ_API_KEY=sua_chave_aqui (Windows)")
        print("   Ou: export GROQ_API_KEY=sua_chave_aqui (Linux/Mac)")
        return
    
    print("🚀 Iniciando filtro de questões com IA...")
    
    # Verificar se year-range foi especificado
    if args.year_range:
        try:
            # Parse do intervalo (ex: "2009-2023")
            start_year, end_year = map(int, args.year_range.split('-'))
            years = list(range(start_year, end_year + 1))
            
            print(f"📅 Processando anos: {start_year} até {end_year}")
            if args.start_question:
                print(f"🎯 Começando a partir da questão {args.start_question} (apenas no primeiro ano)")
            
            # Processar cada ano
            for i, year in enumerate(years):
                print(f"\n{'='*50}")
                print(f"📅 Processando ENEM {year} ({i+1}/{len(years)})")
                
                # Construir comando para este ano
                cmd_parts = [f"python filter_questions_ai.py --api-key {api_key} --year {year}"]
                
                # Adicionar start-question apenas no primeiro ano
                if args.start_question and i == 0:
                    cmd_parts.append(f"--start-question {args.start_question}")
                
                # Adicionar outros argumentos
                if args.retry_failed:
                    cmd_parts.append("--retry-failed")
                if args.show_errors:
                    cmd_parts.append("--show-errors")
                if args.validate:
                    cmd_parts.append("--validate")
                
                # Executar comando
                cmd = " ".join(cmd_parts)
                print(f"Executando: {cmd}")
                result = os.system(cmd)
                
                if result != 0:
                    print(f"⚠️  Erro ao processar {year}. Continuando...")
                
                print(f"✅ Concluído: {year}")
            
            print(f"\n🎉 Processamento de todos os anos concluído!")
            return
            
        except ValueError:
            print("❌ Formato inválido para --year-range. Use: 2009-2023")
            return
    
    # Processamento normal (ano único ou todos os anos)
    cmd_parts = [f"python filter_questions_ai.py --api-key {api_key}"]
    
    # Adicionar argumentos
    if args.year:
        cmd_parts.append(f"--year {args.year}")
        print(f"📅 Processando apenas o ano {args.year}")
    
    if args.retry_failed:
        cmd_parts.append("--retry-failed")
        print("🔄 Tentando novamente questões que falharam")
    
    if args.show_errors:
        cmd_parts.append("--show-errors")
        print("📊 Mostrando resumo de erros")
    
    if args.validate:
        cmd_parts.append("--validate")
        print("✅ Apenas validando classificações existentes")
    
    if args.start_question:
        cmd_parts.append(f"--start-question {args.start_question}")
        print(f"🎯 Começando a partir da questão {args.start_question}")
    
    print("⏱️  Este processo pode demorar alguns minutos...")
    print()
    
    # Executar o filtro
    cmd = " ".join(cmd_parts)
    print(f"Executando: {cmd}")
    os.system(cmd)

if __name__ == "__main__":
    main()
