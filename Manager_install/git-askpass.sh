#!/bin/bash
# git-askpass.sh — entrega el token de MFS_GIT_TOKEN a git cuando un remoto pide credenciales.
# Lo usa manager_repo.sh (vía GIT_ASKPASS) solo si MFS_GIT_TOKEN está definido.
# Así el token no se escribe en listRep.txt ni en el .git/config de los repos.
#
# En la lista, la URL lleva solo el usuario:  https://usuario@dev.azure.com/org/proyecto/_git/repo
# (también vale "https://usuario:@..."). Si la URL ya trae usuario:token, git no llama a este script.
case "$1" in
    Username*) echo "${MFS_GIT_USER:-mfs}" ;;
    *)         echo "$MFS_GIT_TOKEN" ;;
esac
