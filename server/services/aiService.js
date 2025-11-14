const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fungsi baru untuk memformat data surah
const formatSurahData = (surahArray) => {
  return surahArray.map(ayat => `Ayat ${ayat.id}: "${ayat.text}"`).join('\n');
};

const koreksiHafalan = async (userSpeechText, targetAyatText, expectedAyatIndex, fullSurahData) => {
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const formattedSurah = formatSurahData(fullSurahData);
  const expectedAyatId = fullSurahData[expectedAyatIndex].id;

  const prompt = `
    Anda adalah Asisten Ustadz (Hafiz AI) yang sangat teliti.
    Ustadz sedang menyimak hafalan santri.
    
    KONTEKS:
    1.  Surah Lengkap:
        ${formattedSurah}
    2.  Ayat yang Diharapkan (Posisi Ustadz): Ayat ${expectedAyatId} ("${targetAyatText}")
    3.  Bacaan Santri (Transkrip): "${userSpeechText}"

    TUGAS ANDA (UNTUK DIBACA USTADZ):
    Analisa bacaan santri dan berikan rekomendasi dalam format JSON MURNI.

    ATURAN ANALISA:
    1.  Apakah bacaan santri SESUAI dengan Ayat ${expectedAyatId}?
        - Jika YA, 'isCorrect' = true.
    2.  Jika TIDAK, analisa kesalahannya:
        - Apakah santri salah ucap/salah harakat di Ayat ${expectedAyatId}? (Tipe: "WRONG_WORD")
        - Apakah santri LUPA dan membaca AYAT LAIN? (Misal baca Ayat ${expectedAyatId+1} padahal harusnya ${expectedAyatId}) (Tipe: "SKIP_AYAT")
        - Apakah santri hanya diam/mengucap kata acak? (Tipe: "RANDOM")
    3.  'adminMessage' harus detail (untuk Ustadz).
    4.  'santriGuidance' harus singkat & jelas (untuk Santri, jika diperlukan).

    CONTOH JIKA AYAT 4 DI-SKIP:
    {
      "isCorrect": false,
      "detectedAyatId": 5,
      "errorType": "SKIP_AYAT",
      "adminMessage": "ANALISA: Santri melewatkan Ayat ${expectedAyatId} dan langsung membaca Ayat 5. Bacaannya (Ayat 5) benar, tapi urutannya salah.",
      "santriGuidance": "Bacaanmu sudah bagus, tapi ada ayat yang terlewat. Coba ulangi dari Ayat ${expectedAyatId}."
    }

    CONTOH JIKA AYAT 4 SALAH BACA:
    {
      "isCorrect": false,
      "detectedAyatId": 4,
      "errorType": "WRONG_WORD",
      "adminMessage": "ANALISA: Santri salah membaca di Ayat 4. Dia bilang 'Maliki yaumid-DOOM' padahal seharusnya 'Maliki yaumid-DIN'.",
      "santriGuidance": "Hampir benar, perhatikan makhraj di akhir Ayat 4."
    }

    CONTOH JIKA BENAR:
    {
      "isCorrect": true,
      "detectedAyatId": ${expectedAyatId},
      "errorType": "NONE",
      "adminMessage": "ANALISA: Bacaan Ayat ${expectedAyatId} sudah benar dan lancar.",
      "santriGuidance": "Bagus, lancar."
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log("Raw Response from AI:", text); 
    const jsonResult = JSON.parse(text);
    return jsonResult;

  } catch (error) {
    console.error("❌ Error Gemini:", error);
    return {
      isCorrect: false,
      errorType: "AI_ERROR",
      adminMessage: "Maaf, AI sedang gangguan.",
      santriGuidance: "Gagal memproses."
    };
  }
};

module.exports = { koreksiHafalan };