// ============================================================
// 4. SUBIR FOTOS A CLOUDINARY CON LOGS DE DEPURACIÓN
// ============================================================
console.log('📸 Entrando al bloque de fotos...');

if (fotos && Array.isArray(fotos)) {
  console.log(`📸 Se recibieron ${fotos.length} fotos.`);
  
  for (let i = 0; i < fotos.length; i++) {
    const base64 = fotos[i];
    console.log(`📸 Procesando foto ${i + 1}...`);
    
    try {
      console.log('📸 Subiendo a Cloudinary...');
      const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64}`, {
        folder: 'visitas',
        resource_type: 'image'
      });
      console.log('✅ Cloudinary OK:', result.secure_url);
      
      await pool.query(
        `INSERT INTO fotos (visita_id, url) VALUES ($1, $2)`,
        [visitaId, result.secure_url]
      );
      console.log('✅ URL guardada en BD');
      
    } catch (err) {
      console.error('❌ Error subiendo a Cloudinary:', err.message);
      console.error('❌ Detalles del error:', err);
    }
  }
} else {
  console.log('📸 No se recibieron fotos o no es un array.');
}
