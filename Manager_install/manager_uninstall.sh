#!/bin/bash
# Documentación del Script
# ==========================
# Script de Desinstalación de Manager Scripts
# Versión: 1.0
# Fecha: [27-02-2025]
#
# Descripción:
# Este script se encarga de desinstalar el directorio de scripts de gestión
# y eliminar las funciones asociadas del archivo .bashrc. 
# Se asegura de que no queden residuos de la instalación anterior.
#
# Funcionalidades:
# - Elimina la carpeta de instalación si existe.
# - Elimina las funciones 'mfs()' y 'url_extractor()' del archivo .bashrc.
# - Muestra mensajes informativos y de advertencia durante el proceso.
#
# Uso:
# Para ejecutar este script, simplemente utiliza el siguiente comando en la terminal:
#  ./manager_uninstall.sh o con el alias de  mfs  manager_uninstall
#

# Notas:
# - Este script modifica el archivo .bashrc, por lo que se recomienda hacer
#   una copia de seguridad de este archivo antes de ejecutar el script.


# Definición de colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
RESET="\e[0m"
file_name="$(basename "$0")"
# Funciones de registro
log_info() {
    printf "${GREEN} [INFO] $1 ${RESET}\n"
}

log_warning() {
    printf "${YELLOW} [WARNING] $1 ${RESET}\n"
}
log_info "Ejecutando $file_name"
# Definir la ruta donde se creó la carpeta para los scripts
INSTALL_DIR="$HOME/manager_scripts"
ALIAS_FILE="$HOME/.bashrc"

# Eliminar la carpeta de instalación si existe
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    log_info "Carpeta eliminada: $INSTALL_DIR"
else
    log_warning "La carpeta no existe: $INSTALL_DIR"
fi

# Eliminar la función mfs() del archivo .bashrc
if grep -q "mfs() {" "$ALIAS_FILE"; then
    # Eliminar la función completa
    sed -i '/mfs() {/,/^}/d' "$ALIAS_FILE"
    log_info "Función 'mfs()' eliminada del archivo: $ALIAS_FILE"
else
    log_warning "No se encontró la función 'mfs()' en: $ALIAS_FILE"
fi

# Eliminar la función url_extractor() del archivo .bashrc
if grep -q "url_extractor() {" "$ALIAS_FILE"; then
    # Eliminar la función completa
    sed -i '/url_extractor() {/,/^}/d' "$ALIAS_FILE"
    log_info "Función 'url_extractor()' eliminada del archivo: $ALIAS_FILE"
else
    log_warning "No se encontró la función 'url_extractor()' en: $ALIAS_FILE"
fi

source ~/.bashrc
# Mensaje final
log_info "Desinstalación completada."
