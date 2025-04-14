#!/bin/bash
# manager_setup.sh
# Script para clonar, descomprimir e instalar Manager.
# Este script está diseñado para descargar la última versión del repositorio Manager
# desde la rama principal de GitHub, preparar los archivos necesarios y proceder
# con la instalación automatizada del sistema Manager.
#
# Funciones incluidas:
# 1. clone_repo: Clona la última versión del repositorio desde la rama principal.
# 2. decompress_repo: Descomprime los archivos necesarios para la instalación.
# 3. install: Realiza la instalación del sistema Manager según las opciones del usuario.
#
# Uso:
# Ejecuta este script en tu terminal y sigue las instrucciones.

set -e

# Función para clonar el repositorio
clone_repo() {
    echo "Clonando el repositorio..."
    curl -L -o repo.zip https://github.com/noxopio/manager_scripts/archive/refs/heads/main.zip
    if [ ! -f repo.zip ]; then
        echo "Error: No se pudo descargar el repositorio. Verifica la URL."
        exit 1
    fi
}

# Función para descomprimir los archivos
decompress_repo() {
    echo "Descomprimiendo los archivos..."
    unzip -q repo.zip "manager_scripts-main/Manager_install/*" || {
        echo "Error: Falló la descompresión del archivo."
        exit 1
    }
    if [ ! -d "manager_scripts-main/Manager_install" ]; then
        echo "Error: No se encontraron los archivos necesarios tras la descompresión."
        exit 1
    fi
    mv manager_scripts-main/Manager_install .
    rm -rf manager_scripts-main repo.zip
}

# Función para instalar
install() {
    printf "¿Desea instalar Manager? [s/n]: "
    read install
    case "$install" in
        [sS])
            if ! cd Manager_install; then
                echo "Error: No se pudo acceder al directorio Manager_install."
                exit 1
            fi
            chmod +x *.sh
            if [ ! -f "manager_install.sh" ]; then
                echo "Error: No se encontró el archivo manager_install.sh."
                exit 1
            fi
            sh manager_install.sh
            ;;
        *)
            echo "Instalación cancelada por el usuario."
            ;;
    esac
}

# Función principal
main() {
    clone_repo
    decompress_repo
    install
}

# Llamada a la función principal
main "$@"
