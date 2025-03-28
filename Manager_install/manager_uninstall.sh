#!/bin/bash
set -e
# Documentación del Script
# ==========================
# Script de Desinstalación de Manager Scripts
# Versión: 2.0.2
# Fecha: [27-02-2025]
###Esta version requiere estar en el mismo directorio con el script manager_logs.sh, ya que este contiene las funciones de mensajes. 
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  
#   | |                                       | |  
#   | |  888b     d888 8888888888  .d8888b.   | |  
#   | |  8888b   d8888 888        d88P  Y88b  | |  
#   | |  88888b.d88888 888        Y88b.       | |  
#   | |  88BYE8888P888 4048888     "Y888b.    | |  
#   | |  888 Y888P 888 888            "Y88b.  | |  
#   | |  888  Y8P  888 888              "888  | |  
#   | |  888   "   888 888        Y88b  d88P  | |  
#   | |  888       888 888         "Y8888P"   | |  
#   | |                                       | |  
# __| |_______________________________________| |__
# __   _______________________________________   __
#   | |                                       | |  


# Descripción:
# Este script se encarga de desinstalar el directorio de scripts de gestión
# y eliminar las funciones asociadas del archivo .bashrc. 
# Se asegura de que no queden residuos de la instalación anterior.
#
# Funcionalidades:
# - Elimina la carpeta de instalación si existe.
# - Elimina las funciones de Manager Scripts del archivo .bashrc.
# - Muestra mensajes informativos y de advertencia durante el proceso.
#
# Uso:
# Para ejecutar este script, simplemente utiliza el siguiente comando en la terminal:
#  ./manager_uninstall.sh o con el alias de  mfs  manager_uninstall
# usa --help  para obtener más información.
#

# Notas:
# - Este script modifica el archivo .bashrc, por lo que se recomienda hacer
#   una copia de seguridad de este archivo antes de ejecutar el script.

# Inicio de funciones de mensajes

source "$(dirname "$0")/manager_logs.sh"
FILE_NAME="$(basename "$0")"
SHOW_BORDER=true 
UNINSTALLED=false
INSTALL_DIR="$HOME/manager_scripts"
ALIAS_FILE="$HOME/.bashrc"



show_help() {
    log_info "Uso: $0" "no-prefix"
    log_info "Desinstala Manager Scripts y elimina las funciones asociadas del archivo .bashrc."
    exit 0
}

confirm() {
    log_warning "¿Estás seguro de que deseas desinstalar Manager Scripts? (s/n): " 
    printf "\t[s/n]: "
     read     confirm
    confirm=$(echo "$confirm" | tr '[:upper:]' '[:lower:]')
        if [ "$confirm" != "s" ]; then
        log_warning "Desinstalación cancelada."
        exit 0
    fi

}
remove_install_dir() {
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        log_info "Carpeta eliminada: $INSTALL_DIR"
    else
        log_warning "La carpeta no existe: $INSTALL_DIR"
    fi
}

remove_functions() {
    if grep -q "# >>> Manager Scripts START" "$ALIAS_FILE"; then
        # Eliminar el bloque completo
        sed -i "/# >>> Manager Scripts START/,/# <<< Manager Scripts END/d" "$ALIAS_FILE"
        log_info "Funciones de Manager Scripts eliminado del archivo: $ALIAS_FILE"
        source ~/.bashrc
        log_success "Desinstalación completada."
        message_uninstall
        log_warning "$(date +"%Y-%m-%d %H:%M:%S")" "no-prefix"
    else
        log_warning "No se encontraron funciones de Manager Scripts en: $ALIAS_FILE"
        error_404
        log_warning "$(date +"%Y-%m-%d %H:%M:%S")" "no-prefix"
        exit 1
    fi
}


main() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        show_help
    fi

    confirm
    log_info "Ejecutando $FILE_NAME"

    remove_install_dir
    remove_functions
    exit 0
}

main "$@"