import logger from '@sequentialos/sequential-logging';
export const SYSTEM_FOLDERS = {
  root: '/',
  desktop: '/Desktop',
  tasks: '/tasks',
  tools: '/tools',
  flows: '/flows',
  docs: '/docs',
  cache: '/.cache'
};

export async function ensureDesktopFolder(adaptor) {
  try {
    const desktopPath = SYSTEM_FOLDERS.desktop;
    const exists = await adaptor.exists(desktopPath);
    if (!exists) {
      await adaptor.mkdir(desktopPath);
    }
    return true;
  } catch (e) {
    logger.error('Failed to ensure desktop folder:', e);
    return false;
  }
}

export async function getDesktopItems(adaptor) {
  try {
    return await adaptor.readdir(SYSTEM_FOLDERS.desktop);
  } catch (e) {
    logger.error('Failed to read desktop items:', e);
    return [];
  }
}

export async function moveToDesktop(adaptor, sourcePath) {
  try {
    const name = sourcePath.split('/').pop();
    const destPath = `${SYSTEM_FOLDERS.desktop}/${name}`;
    await adaptor.move(sourcePath, destPath);
    return destPath;
  } catch (e) {
    logger.error('Failed to move to desktop:', e);
    throw e;
  }
}

export async function deleteFromDesktop(adaptor, itemPath) {
  try {
    await adaptor.delete(itemPath);
    return true;
  } catch (e) {
    logger.error('Failed to delete from desktop:', e);
    throw e;
  }
}