#!/bin/bash

# Definición de colores
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
CIAN="\e[36m"
MAGENTA="\e[35m"
RESET="\e[0m"

# Funciones de registro
log_info() {
    printf "${CIAN} [INFO] $1 ${RESET}\n"
}

log_warning() {
    printf "${YELLOW} [WARNING] $1 ${RESET}\n"
}

log_error() {
    printf "${RED} [ERROR] $1 ${RESET}\n"
}

# Definir la ruta donde se creará la carpeta para los scripts
INSTALL_DIR="$HOME/manager_scripts"
SOURCE_DIR="$(dirname "$0")" 
# Crear la carpeta si no existe
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    log_info "Carpeta creada en $INSTALL_DIR"
else
     log_warning "La carpeta ya existe en $INSTALL_DIR"
fi

# Copiar los scripts a la carpeta
cp "$SOURCE_DIR/manager_repo.sh" "$INSTALL_DIR/"
cp "$SOURCE_DIR/url_extractor.sh" "$INSTALL_DIR/"
log_info "Scripts copiados a $INSTALL_DIR"
# Agregar fecha y hora de creación y de instalación a los scripts
INSTALL_DATE=$(date +"%Y-%m-%d %H:%M:%S")  # Formato: YYYY-MM-DD HH:MM:SS
for script in "$INSTALL_DIR/manager_repo.sh" "$INSTALL_DIR/url_extractor.sh"; do
    echo -e "# Fecha de creación: 2025-02-27 \n# Fecha de instalación: $INSTALL_DATE\n" | cat - "$script" > temp && mv temp "$script"
done
# Dar permisos de ejecución a los scripts
chmod +x "$INSTALL_DIR/"*.sh
log_info "Permisos de ejecución otorgados a los scripts"

# Crear alias en .bashrc
ALIAS_FILE="$HOME/.bashrc"

# Verificar si los alias ya están en .bashrc
if ! grep -q "manager()" "$ALIAS_FILE"; then
     log_info "Creando alias para manager y url_extractor en $ALIAS_FILE"
    
    cat << EOL >> "$ALIAS_FILE"
manager() {
    $INSTALL_DIR/manager_repo.sh "\$@"
}

url_extractor() {
    $INSTALL_DIR/url_extractor.sh "\$@"
}
EOL
else
   log_warning "Los alias ya existen en $ALIAS_FILE"
fi

# Mensaje final
log_info "Instalación completada. Puedes ejecutar tus scripts desde $INSTALL_DIR"
source ~/.bashrc

cd "$INSTALL_DIR" && explorer .