#!/bin/bash
# https://github.com/Streamings-Team2

ORG_NAME="Streamings-Team2"
BASE_URL="https://api.github.com/orgs/$ORG_NAME/repos"
URL="$BASE_URL"

# Para repos privados, descomentar y proporcionar el token
# TOKEN="tu_token"

# URL de la API de GitHub para obtener los repositorios de una organización

# ------------------------------------------------------------------------------------

# Función para extraer URLs de repositorios y eliminar duplicados
extract_urls() {
  echo "$1" | grep -o '"html_url": "[^"]*' | sed 's/"html_url": "//' | sort | uniq
}

# Inicializar archivo de salida
> listRep.txt

# Comprobar si se requiere token
if [ -n "$TOKEN" ]; then
  # Realizar la solicitud GET a la API con token
  echo "Accediendo a repositorios privados con token..."
  while true; do
    response=$(curl -H "Authorization: token $TOKEN" -s -I "$URL")
    body=$(curl -H "Authorization: token $TOKEN" -s "$URL")

    # Extraer las URLs de los repositorios y añadirlas al archivo
    extract_urls "$body" >> listRep.txt

    # Verificar si hay más páginas (esto lo indica el encabezado "Link")
    next_page=$(echo "$response" | grep -i "Link: " | grep -o '<[^>]*>; rel="next"' | sed -e 's/<\(.*\)>; rel="next"/\1/')

    if [ -z "$next_page" ]; then
      break
    fi

    # Actualizar la URL con el enlace de la siguiente página
    URL="$next_page"
  done

else
  # Acceso a repositorios públicos
  echo "Accediendo a repositorios públicos..."
  while true; do
    response=$(curl -s -I "$URL")
    body=$(curl -s "$URL")

    # Extraer las URLs de los repositorios y añadirlas al archivo
    extract_urls "$body" >> listRep.txt

    # Verificar si hay más páginas (esto lo indica el encabezado "Link")
    next_page=$(echo "$response" | grep -i "Link: " | grep -o '<[^>]*>; rel="next"' | sed -e 's/<\(.*\)>; rel="next"/\1/')

    if [ -z "$next_page" ]; then
      break
    fi

    # Actualizar la URL con el enlace de la siguiente página
    URL="$next_page"
  done
fi

# Eliminar duplicados finales en el archivo
sort -u listRep.txt -o listRep.txt

while IFS= read -r repo; do
  echo " ▶  - $repo..."
   ((counter++))
  # git clone "$repo"&
done < listRep.txt
echo "Urls: $counter"

