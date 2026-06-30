import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

// ============================================================
// 🔴 URL DE LA API EN RAILWAY (DEBE SER EXACTAMENTE ESTA)
// ============================================================
const API_URL = 'https://registro-visitas-production.up.railway.app/api';

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function RegistroVisita({ route, navigation }) {
  const { tecnicoId, token } = route.params;

  // Estados
  const [servicios, setServicios] = useState([]);
  const [identificador, setIdentificador] = useState('');      // ← NUEVO
  const [servicioId, setServicioId] = useState('');
  const [ubicacion, setUbicacion] = useState({
    lat: null,
    lng: null,
    dir: 'Obteniendo...'
  });
  const [actividades, setActividades] = useState([{ descripcion: '', tiempo: '' }]);
  const [fotos, setFotos] = useState([]);
  const [novedad, setNovedad] = useState({ tipo: '', descripcion: '' });
  const [cargando, setCargando] = useState(false);

  // ============================================================
  // 1. CARGAR LISTA DE SERVICIOS
  // ============================================================
  useEffect(() => {
    const cargarServicios = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const resServicios = await axios.get(`${API_URL}/visitas/servicios`, config);
        setServicios(resServicios.data);
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar la lista de servicios');
      }
    };
    cargarServicios();
  }, []);

  // ============================================================
  // 2. OBTENER UBICACIÓN ACTUAL
  // ============================================================
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No podremos registrar la ubicación');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      let reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      let address = reverse[0]
        ? `${reverse[0].street}, ${reverse[0].city}`
        : 'Dirección desconocida';
      setUbicacion({ lat: latitude, lng: longitude, dir: address });
    })();
  }, []);

  // ============================================================
  // 3. TOMAR FOTO
  // ============================================================
  const tomarFoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setFotos([...fotos, result.assets[0].base64]);
    }
  };

  // ============================================================
  // 4. ENVIAR VISITA (con identificador)
  // ============================================================
  const enviarVisita = async () => {
    // Validaciones
    if (!identificador || identificador.trim() === '') {
      Alert.alert('Error', 'Ingresa un identificador (cédula o código de 6 dígitos)');
      return;
    }
    if (identificador.length !== 6 && identificador.length !== 10) {
      Alert.alert('Error', 'El identificador debe tener 6 o 10 dígitos');
      return;
    }
    if (!servicioId) {
      Alert.alert('Error', 'Selecciona un servicio');
      return;
    }

    setCargando(true);
    try {
      const payload = {
        tecnico_id: tecnicoId,
        identificador: identificador.trim(),
        servicio_id: parseInt(servicioId),
        latitud: ubicacion.lat,
        longitud: ubicacion.lng,
        direccion: ubicacion.dir,
        actividades: actividades.filter(a => a.descripcion !== ''),
        novedades: novedad.descripcion ? novedad : null,
        fotos: fotos
      };

      const response = await axios.post(`${API_URL}/visitas/iniciar`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('✅ Éxito', `Visita registrada con ID: ${response.data.visita_id}`);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la visita');
    } finally {
      setCargando(false);
    }
  };

  // ============================================================
  // 5. RENDERIZADO DE LA PANTALLA
  // ============================================================
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nueva Visita</Text>

      {/* IDENTIFICADOR (NUEVO) */}
      <View style={styles.card}>
        <Text>👤 Identificador (cédula o código de 6 dígitos):</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 1234567890 o 123456"
          value={identificador}
          onChangeText={setIdentificador}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* SERVICIO */}
      <View style={styles.card}>
        <Text>📋 Servicio:</Text>
        <Picker
          selectedValue={servicioId}
          onValueChange={(v) => setServicioId(v)}
        >
          <Picker.Item label="Selecciona un servicio..." value="" />
          {servicios.map(s => (
            <Picker.Item key={s.id} label={s.nombre} value={String(s.id)} />
          ))}
        </Picker>
      </View>

      {/* UBICACIÓN */}
      <View style={styles.card}>
        <Text>📍 Ubicación:</Text>
        <Text>{ubicacion.dir}</Text>
        <Text style={{ fontSize: 10 }}>
          Lat: {ubicacion.lat} / Lng: {ubicacion.lng}
        </Text>
      </View>

      {/* ACTIVIDADES */}
      <View style={styles.card}>
        <Text>⚙️ Actividades:</Text>
        {actividades.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', marginVertical: 3 }}>
            <TextInput
              placeholder="Descripción"
              value={item.descripcion}
              onChangeText={(text) => {
                let newActs = [...actividades];
                newActs[index].descripcion = text;
                setActividades(newActs);
              }}
              style={[styles.input, { flex: 2 }]}
            />
            <TextInput
              placeholder="Min"
              value={item.tiempo}
              onChangeText={(text) => {
                let newActs = [...actividades];
                newActs[index].tiempo = text;
                setActividades(newActs);
              }}
              keyboardType="numeric"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        ))}
        <Button
          title="+ Agregar Actividad"
          onPress={() =>
            setActividades([...actividades, { descripcion: '', tiempo: '' }])
          }
        />
      </View>

      {/* NOVEDAD */}
      <View style={styles.card}>
        <Text>⚠️ Novedad:</Text>
        <TextInput
          placeholder="Tipo"
          value={novedad.tipo}
          onChangeText={(t) => setNovedad({ ...novedad, tipo: t })}
          style={styles.input}
        />
        <TextInput
          placeholder="Descripción"
          value={novedad.descripcion}
          onChangeText={(d) => setNovedad({ ...novedad, descripcion: d })}
          style={styles.input}
          multiline
        />
      </View>

      {/* FOTOS */}
      <View style={styles.card}>
        <Text>📸 Fotos ({fotos.length})</Text>
        <Button title="📷 Tomar Foto" onPress={tomarFoto} />
        <ScrollView horizontal>
          {fotos.map((base64, idx) => (
            <Image
              key={idx}
              source={{ uri: `data:image/jpeg;base64,${base64}` }}
              style={{ width: 80, height: 80, margin: 5 }}
            />
          ))}
        </ScrollView>
      </View>

      {/* BOTÓN GUARDAR */}
      {cargando ? (
        <ActivityIndicator size="large" color="green" />
      ) : (
        <Button title="✅ Guardar Visita" onPress={enviarVisita} color="green" />
      )}
    </ScrollView>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 5,
    marginVertical: 3
  }
});
