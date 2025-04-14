#!/bin/bash
# manager_setup.sh
# Script para clonar e instalar el paquete Manager.
# Funciones incluidas:
# 1. clone_repo: Clona la última versión del repositorio desde la rama principal.
# 2. install: Realiza la instalación de la herramienta Manager según las opciones del usuario.
# Uso:
# Ejecuta este script en tu terminal y sigue las instrucciones.

set -e

# Función para clonar el repositorio
clone_repo() {
    echo "Clonando el repositorio..."
    if git clone --depth=1 https://github.com/noxopio/manager_scripts.git; then
        echo "Repositorio clonado con éxito."
    else
        echo "Error: No se pudo clonar el repositorio. Verifique la URL o la conexión a Internet."
        exit 1
    fi

    # Verificar y mover el directorio necesario
    if [ -d "manager_scripts/Manager_install" ]; then
        mv manager_scripts/Manager_install .
        rm -rf manager_scripts
    else
        echo "Error: No se encontró el directorio Manager_install en el repositorio clonado."
        exit 1
    fi
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

main() {
    clone_repo
    install
}

main "$@"