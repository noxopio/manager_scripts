#!/bin/bash
# https://github.com/Streamings-Team2

# Documentación del Script
# ==========================
# Script para Extraer URLs de Repositorios de GitHub
# Versión: 1.0

# Fecha: [27/02/2025]
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  
#   | |                                       | |  
#   | |  888b     d888 8888888888  .d8888b.   | |  
#   | |  8888b   d8888 888        d88P  Y88b  | |  
#   | |  88888b.d88888 888        Y88b.       | |  
#   | |  888Y88888P888 8888888     "Y888b.    | |  
#   | |  888 Y888P 888 888            "Y88b.  | |  
#   | |  888  Y8P  888 888              "888  | |  
#   | |  888   "   888 888        Y88b  d88P  | |  
#   | |  888       888 888         "Y8888P"   | |  
#   | |                                       | |  
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  


#
# Descripción:
# Este script se encarga de extraer las URLs de los repositorios de una organización
# de GitHub, ya sea pública o privada, y guardarlas en un archivo llamado listRep.txt.
# Si se proporciona un token de acceso, el script puede acceder a repositorios privados.
#
# Funcionalidades:
# - Extrae las URLs de los repositorios de la organización especificada.
# - Maneja la paginación de la API de GitHub para obtener todos los repositorios.
# - Elimina URLs duplicadas antes de guardarlas en el archivo.
# - Imprime el total de URLs extraídas al final de la ejecución.
#
# Uso:
# 1. Configura el nombre de la organización en la variable ORG_NAME.
# 2. Si deseas acceder a repositorios privados, descomenta la línea que define TOKEN
#    y proporciona tu token de acceso personal de GitHub.
# 3. Ejecuta el script con el siguiente comando:
#    ./url_repos.sh o usa  manager list  desde la terminal.
#
# Requisitos:
# - Asegúrate de tener 'curl' instalado en tu sistema.
#
# Notas:
# - Este script modifica el archivo listRep.txt en el directorio actual.
# - Asegúrate de que el token de acceso tenga los permisos necesarios para acceder
#   a los repositorios privados, si es aplicable.

ORG_NAME="Streamings-Team2"
BASE_URL="https://api.github.com/orgs/$ORG_NAME/repos"
URL="$BASE_URL"

border() {
    local color="$1"
    local message="$2"
    local length=$(( ${#message} + 4 ))
    local border_line=$(printf '%0.s─' $(seq 1 $length))
    
    echo -e "${color}╭${border_line}╮"
    echo -e "│  ${message}  │"
    echo -e "╰${border_line}╯${RESET}"
}

# Funciones de logging mejoradas
log_info() {
    local message="[INFO] $1"
    if [ "$2" = "no-prefix" ]; then
        message="$1"
    fi
    border "$CIAN" "$message"
}
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
log_info "Accediendo a repositorios privados con token..."
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
 log_info "Accediendo a repositorios públicos..."
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
  # echo " ▶  - $repo..."
   ((counter++))
  # git clone "$repo"&
done < listRep.txt
log_info "Urls: $counter"

