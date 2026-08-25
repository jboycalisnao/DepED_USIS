!include LogicLib.nsh
!include WordFunc.nsh
!insertmacro VersionCompare

!macro customInit
  ReadRegStr $0 SHCTX "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"

  ${If} $0 != ""
    ${VersionCompare} "$0" "${VERSION}" $1

    ${If} $1 == 1
      MessageBox MB_ICONSTOP|MB_OK "A newer version of ${PRODUCT_NAME} is already installed.$\r$\n$\r$\nInstalled version: $0$\r$\nInstaller version: ${VERSION}$\r$\n$\r$\nThis installer will now close to prevent a downgrade."
      Abort
    ${ElseIf} $1 == 0
      MessageBox MB_ICONQUESTION|MB_OKCANCEL "Version ${VERSION} of ${PRODUCT_NAME} is already installed.$\r$\n$\r$\nContinue only if you want to repair or reinstall the same version." IDOK +2
      Abort
    ${EndIf}
  ${EndIf}
!macroend
