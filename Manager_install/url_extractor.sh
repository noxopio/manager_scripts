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

initialize_script() {
    source "$(dirname "$0")/manager_logs.sh"
   
}


show_help() {
    log_info "Uso: $0" "no-prefix"
    log_info "Este script extrae las URLs de los repositorios de una organización de GitHub." "no-prefix"
    exit 0
}

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
fi


# Función para solicitar el nombre de la organización
get_org_name() {
    while true; do
        log_info "Ingrese el nombre de la organización: " "no-prefix"
        printf "\t[ORG_NAME]: "
        read ORG_NAME
        if [[ -n "$ORG_NAME" ]]; then
            break
        else
            log_warning "El nombre de la organización no puede estar vacío. Inténtalo de nuevo."
        fi
    done
}

get_token() {
    while true; do
        log_info "Ingrese el token de acceso (deje vacío para acceso público): "
        printf "\t [TOKEN]: "
        read TOKEN
        break 
    done
}

generate_empty_file() {
cat <<EOL > listRep.txt
# EXCLUDE ## Este es un archivo de ejemplo para listar repositorios.
# EXCLUDE # Cada línea debe contener la URL de un repositorio.
# EXCLUDE # Para excluir repositorios específicos, agrega '#EXCLUDE'.
# EXCLUDE # Utiliza '#NEW' para abrir el repositorio en una nueva ventana de terminal.
# EXCLUDE # Opcionalmente, puedes indicar el comando a ejecutar al final de la URL.
https://github.com/usuario/repo1.git #NEW
https://github.com/usuario/repo2.git
https://github.com/usuario/repo3.git #EXCLUDE
https://github.com/usuario/repo4.git npm run dev #NEW
https://github.com/usuario/repo5.git npm run dev
# EXCLUDE Borrar todo lo anterior y agregar nuevas URLs aquí.
EOL
    log_success "El archivo listRep.txt se ha generado con ejemplos. Puede configurarlo manualmente."
    log_info "Abra el directorio actual para editar el archivo listRep.txt."
    message_open_directory
}

message_empty_file(){
log_info "¿Desea generar un archivo listRep.txt  para configurar manualmente?:  "
log_warning "Si listRep.txt ya existe, se sobrescribirá."
printf "\t[s/n]: "
read generate_empty
case "$generate_empty" in
    [sS])
        generate_empty_file
        ;;
    *)
        get_org_name
        ;;
esac
}


show_org(){
log_info "La organización es: $ORG_NAME"
BASE_URL="https://api.github.com/orgs/$ORG_NAME/repos"
URL="$BASE_URL"
}
extract_urls() {
     > listRep.txt
    echo "$1" | grep -o '"html_url": "[^"]*' | sed 's/"html_url": "//' | sort | uniq
}
fetch_repositories() {
    local headers=()
    [ -n "$TOKEN" ] && headers=(-H "Authorization: token $TOKEN")
    while true; do
        response=$(curl "${headers[@]}" -s -I "$URL")
        body=$(curl "${headers[@]}" -s "$URL")

        extract_urls "$body" >> listRep.txt

        next_page=$(echo "$response" | grep -i "Link: " | grep -o '<[^>]*>; rel="next"' | sed -e 's/<\(.*\)>; rel="next"/\1/')
        if [ -z "$next_page" ]; then
            break
        fi
        URL="$next_page"
    done
}


end_process() {
    sort -u listRep.txt -o listRep.txt
    local counter=$(wc -l < listRep.txt)

    if [ "$counter" -eq 0 ]; then
        log_warning "No se encontraron repositorios para la organización '$ORG_NAME'."
        log_info "Posibles causas:"
        log_info "1. La organización no existe" "no-prefix"
        log_info "2. El token no tiene permisos" "no-prefix"
        log_info "3. No hay repositorios disponibles" "no-prefix"
        exit 1
    else
        log_success "Se han extraído $counter URLs de repositorios de '$ORG_NAME'."
        message_open_directory
    fi
}

main() {
    initialize_script
    message_empty_file
    show_org
    fetch_repositories
    get_token
    end_process
}
main