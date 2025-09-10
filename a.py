import os
import shutil

# Caminhos base
private_base = "private"
public_base = "public"

# Lista de arquivos (caminhos relativos a partir de "private/public")
files = [
    r"year\2010\questions\92-ingles\details.json",
    r"year\2011\questions\91-espanhol\details.json",
    r"year\2011\questions\92-espanhol\details.json",
    r"year\2011\questions\93-espanhol\details.json",
    r"year\2011\questions\94-espanhol\details.json",
    r"year\2012\questions\91-espanhol\details.json",
    r"year\2012\questions\91-ingles\details.json",
    r"year\2012\questions\92-espanhol\details.json",
    r"year\2012\questions\93-espanhol\details.json",
    r"year\2012\questions\95-espanhol\details.json",
    r"year\2013\questions\92-espanhol\details.json",
    r"year\2013\questions\93-espanhol\details.json",
    r"year\2013\questions\93-ingles\details.json",
    r"year\2013\questions\94-espanhol\details.json",
    r"year\2013\questions\94-ingles\details.json",
    r"year\2014\questions\92-espanhol\details.json",
    r"year\2014\questions\92-ingles\details.json",
    r"year\2014\questions\93-espanhol\details.json",
    r"year\2014\questions\93-ingles\details.json",
    r"year\2014\questions\94-espanhol\details.json",
    r"year\2014\questions\95-espanhol\details.json",
    r"year\2015\questions\91-espanhol\details.json",
    r"year\2015\questions\91-ingles\details.json",
    r"year\2015\questions\93-ingles\details.json",
    r"year\2015\questions\95-espanhol\details.json",
    r"year\2016\questions\92-espanhol\details.json",
    r"year\2016\questions\93-espanhol\details.json",
    r"year\2016\questions\94-espanhol\details.json",
    r"year\2017\questions\1-espanhol\details.json",
    r"year\2017\questions\1-ingles\details.json",
    r"year\2017\questions\3-espanhol\details.json",
    r"year\2017\questions\5-espanhol\details.json",
    r"year\2018\questions\1-espanhol\details.json",
    r"year\2018\questions\3-espanhol\details.json",
    r"year\2018\questions\4-espanhol\details.json",
    r"year\2018\questions\4-ingles\details.json",
    r"year\2018\questions\5-espanhol\details.json",
    r"year\2018\questions\5-ingles\details.json",
    r"year\2019\questions\1-espanhol\details.json",
    r"year\2019\questions\2-espanhol\details.json",
    r"year\2019\questions\3-ingles\details.json",
    r"year\2019\questions\4-espanhol\details.json",
    r"year\2019\questions\4-ingles\details.json",
    r"year\2020\questions\1-espanhol\details.json",
    r"year\2020\questions\2-espanhol\details.json",
    r"year\2020\questions\3-ingles\details.json",
    r"year\2020\questions\4-ingles\details.json",
    r"year\2020\questions\5-ingles\details.json",
    r"year\2021\questions\1-espanhol\details.json",
    r"year\2021\questions\1-ingles\details.json",
    r"year\2021\questions\2-espanhol\details.json",
    r"year\2021\questions\2-ingles\details.json",
    r"year\2021\questions\3-espanhol\details.json",
    r"year\2021\questions\3-ingles\details.json",
    r"year\2021\questions\4-espanhol\details.json",
    r"year\2021\questions\5-ingles\details.json",
    r"year\2022\questions\1-ingles\details.json",
    r"year\2022\questions\2-espanhol\details.json",
    r"year\2022\questions\2-ingles\details.json",
    r"year\2022\questions\4-espanhol\details.json",
    r"year\2022\questions\4-ingles\details.json",
    r"year\2022\questions\5-ingles\details.json",
    r"year\2023\questions\1-espanhol\details.json",
    r"year\2023\questions\2-espanhol\details.json",
    r"year\2023\questions\2-ingles\details.json",
    r"year\2023\questions\3-espanhol\details.json",
    r"year\2023\questions\3-ingles\details.json",
    r"year\2023\questions\4-ingles\details.json",
    r"year\2023\questions\5-espanhol\details.json",
    r"year\2023\questions\5-ingles\details.json"
]

for rel_path in files:
    src = os.path.join(private_base, rel_path)
    dst = os.path.join(public_base, rel_path)

    # cria as pastas no destino, se não existirem
    os.makedirs(os.path.dirname(dst), exist_ok=True)

    # copia (sobrescrevendo se já existir)
    shutil.copy2(src, dst)
    print(f"Restaurado: {src} -> {dst}")
