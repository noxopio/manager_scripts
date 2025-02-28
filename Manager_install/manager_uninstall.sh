#!/bin/bash

# Definición de colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
RESET="\e[0m"

# Funciones de registro
log_info() {
    printf "${GREEN} [INFO] $1 ${RESET}\n"
}

log_warning() {
    printf "${YELLOW} [WARNING] $1 ${RESET}\n"
}

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

# Eliminar la función manager() del archivo .bashrc
if grep -q "manager() {" "$ALIAS_FILE"; then
    # Eliminar la función completa
    sed -i '/manager() {/,/^}/d' "$ALIAS_FILE"
    log_info "Función 'manager()' eliminada del archivo: $ALIAS_FILE"
else
    log_warning "No se encontró la función 'manager()' en: $ALIAS_FILE"
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
