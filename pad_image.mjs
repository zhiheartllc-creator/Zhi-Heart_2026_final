import sharp from 'sharp';

async function padIcon() {
  const inputPath = 'public/icon_zhi.png';
  const outputPath = 'public/icon_zhi_padded.png';
  
  try {
    const iconInfo = await sharp(inputPath).metadata();
    // Aumentamos el tamaño del lienzo en un 50% para dar suficiente margen de padding
    const newSize = Math.floor(Math.max(iconInfo.width, iconInfo.height) * 1.5);
    
    await sharp({
      create: {
        width: newSize,
        height: newSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      { input: inputPath, gravity: 'center' }
    ])
    .png()
    .toFile(outputPath);
    
    console.log("Imagen convertida exitosamente con padding.");
  } catch (error) {
    console.error("Error al procesar la imagen:", error);
  }
}

padIcon();
