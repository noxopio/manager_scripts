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
# 1. Proporciona el nombre de la organización  cuando se solicite en la terminal este campo es obligatorio.
# 2. Si deseas acceder a repositorios privados, ingresa tu token de acceso  cuando se solicite.
# 3. Ejecuta el script con el siguiente comando:
#    ./url_repos.sh o usa  mfs list  desde la terminal.
# 4. El script generará un archivo llamado listRep.txt en el directorio actual con las URLs de los repositorios.
# 5. Genera un archivo vacío listRep.txt para configurar manualmente.  
#
# Requisitos:
# - Asegúrate de tener 'curl' instalado en tu sistema.
# - Si no tienes 'curl', puedes instalarlo con el siguiente comando:
#
# Notas:
# - Este script modifica el archivo listRep.txt en el directorio actual.
# - Asegúrate de que el token de acceso tenga los permisos necesarios para acceder
#   a los repositorios privados, si es aplicable.
# - Si no se proporciona un token de acceso, el script solo podrá acceder a repositorios públicos.
# - Si no se encuentran repositorios para la organización especificada, se mostrará un mensaje de advertencia.
# - Si deseas obtener más información sobre la API de GitHub, consulta la documentación oficial en https://docs.github.com/en/rest.
# - Para obtener ayuda, ejecuta el script con la opción --help.
#

source "$(dirname "$0")/manager_logs.sh"

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    log_info "Uso: $0" "no-prefix"
    log_info "Este script extrae las URLs de los repositorios de una organización de GitHub." "no-prefix"
    exit 0
fi

# Función para solicitar el nombre de la organización
get_org_name() {
    while true; do
        log_info "Ingrese el nombre de la organización: " "no-prefix"
        read ORG_NAME
        if [[ -n "$ORG_NAME" ]]; then
            break
        else
            log_warning "El nombre de la organización no puede estar vacío. Inténtalo de nuevo."
        fi
    done
}


# Validar el nombre de la organización
# validate_org_name() {
#     response=$(curl -s -o /dev/null -w "%{http_code}" "https://api.github.com/orgs/$ORG_NAME")
#     if [ "$response" -ne 200 ]; then
#         log_error "La organización '$ORG_NAME' no es válida o no se puede acceder."
#         log_info "Posibles causas:"
#         log_info "1. La organización no existe" "no-prefix"
#         log_info "2. Error tipográfico en el nombre de la organización" "no-prefix"
#         exit 1
#     fi
# }

get_token() {
    while true; do
        log_info "Ingrese el token de acceso (deje vacío para acceso público): "
        read TOKEN
        break 
    done
}

# validate_token() {
#     if [ -n "$TOKEN" ]; then
#         response=$(curl -H "Authorization: token $TOKEN" -s -o /dev/null -w "%{http_code}" "https://api.github.com")
#         if [ "$response" -ne 200 ]; then
#             log_error "El token proporcionado no es válido o no tiene permisos suficientes."
#             exit 1
#         fi
#     fi
# }

generate_empty_file() {
    > listRep.txt
    log_info "El archivo listRep.txt se ha generado vacío. Puede configurarlo manualmente."
    log_info "Abra el directorio actual para editar el archivo listRep.txt."
    log_info "¿Desea abrir el directorio actual? (s/n): "
    read open_directory

    case "$open_directory" in
        [sS])
            explorer .
            ;;
        *)
          log_info "Proceso completado."   
            ;;

    esac
    exit 0
}

# Solicitar al usuario si desea generar el archivo vacío
log_info "¿Desea generar un archivo listRep.txt vacío para configurar manualmente? (s/n): "
read generate_empty
case "$generate_empty" in
    [sS])
        generate_empty_file
        ;;
    *)
        get_org_name
        ;;
esac

# Llamar a las funciones para obtener la entrada y validar
# validate_org_name
log_info "La organización es: $ORG_NAME"
BASE_URL="https://api.github.com/orgs/$ORG_NAME/repos"
URL="$BASE_URL"

get_token
# validate_token

extract_urls() {
    echo "$1" | grep -o '"html_url": "[^"]*' | sed 's/"html_url": "//' | sort | uniq
}

# Inicializar el archivo listRep.txt para almacenar las URLs de los repositorios de GitHub con >> para no sobreescribir
> listRep.txt

# Comprobar si se requiere token
if [ -n "$TOKEN" ]; then
    log_info "Accediendo a repositorios privados con token..."
    while true; do
        response=$(curl -H "Authorization: token $TOKEN" -s -I "$URL")
        body=$(curl -H "Authorization: token $TOKEN" -s "$URL")

        extract_urls "$body" >> listRep.txt

        next_page=$(echo "$response" | grep -i "Link: " | grep -o '<[^>]*>; rel="next"' | sed -e 's/<\(.*\)>; rel="next"/\1/')

        if [ -z "$next_page" ]; then
            break
        fi

        URL="$next_page"
    done
else
    log_info "Accediendo a repositorios públicos..."
    while true; do
        response=$(curl -s -I "$URL")
        body=$(curl -s "$URL")

        extract_urls "$body" >> listRep.txt

        next_page=$(echo "$response" | grep -i "Link: " | grep -o '<[^>]*>; rel="next"' | sed -e 's/<\(.*\)>; rel="next"/\1/')

        if [ -z "$next_page" ]; then
            break
        fi

        URL="$next_page"
    done
fi

# Eliminar duplicados finales en el archivo
sort -u listRep.txt -o listRep.txt
counter=0
while IFS= read -r repo; do
    ((counter++))
done < listRep.txt

if [ "${counter:-0}" -eq 0 ]; then
    log_warning "No se encontraron repositorios para la organización '$ORG_NAME'."
    log_info "Posibles causas:"
    log_info "1. La organización no existe" "no-prefix"
    log_info "2. El token no tiene permisos" "no-prefix"
    log_info "3. No hay repositorios disponibles" "no-prefix"
    exit 1
else
    log_success "Se han extraído $counter URLs de repositorios de '$ORG_NAME'." "no-prefix"
      log_info "Abra el directorio actual para editar el archivo listRep.txt."
    log_info "¿Desea abrir el directorio actual? (s/n): "
    read open_directory

    case "$open_directory" in
        [sS])
            explorer .
            ;;
        *)
        log_info "Proceso completado."
        exit 1
            ;;

    esac
fi

log_info "Proceso completado."