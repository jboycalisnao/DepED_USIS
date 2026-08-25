const path = require('node:path');
const rcedit = require('rcedit');

module.exports = async function stampWindowsIcon(context) {
  if (context.electronPlatformName !== 'win32') return;

  const productName = context.packager.appInfo.productName;
  const productFilename = context.packager.appInfo.productFilename;
  const version = context.packager.appInfo.version;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');

  await rcedit(exePath, {
    icon: iconPath,
    'file-version': version,
    'product-version': version,
    'version-string': {
      CompanyName: 'DepED USIS',
      FileDescription: productName,
      InternalName: productFilename,
      OriginalFilename: `${productFilename}.exe`,
      ProductName: productName,
    },
  });

  console.log(`Stamped Windows executable icon: ${exePath}`);
};
