export const translations = {
  en: {
    worker: "Worker",
    discipline_bonus: "Discipline Bonus",
    before: "before",
    after: "after",
    check_in: "Check-in",
    check_out: "Check-out",
    history: "My History",
    leave_request: "Request Leave",
    leave_info: "Leave Information Center",
    late_quota: "Lateness Quota",
    leave_quota: "Leave Quota",
    emergency_quota: "Emergency Quota",
    arrival_confirm: "Confirm Warehouse Arrival",
  },
  id: {
    worker: "Pekerja",
    discipline_bonus: "Bonus Disiplin",
    before: "sebelum",
    after: "setelah",
    check_in: "Presensi Masuk",
    check_out: "Presensi Keluar",
    history: "Riwayat Saya",
    leave_request: "Ajukan Cuti",
    leave_info: "Pusat Informasi Cuti",
    late_quota: "Jatah Telat",
    leave_quota: "Jatah Libur",
    emergency_quota: "Jatah Darurat Pribadi",
    arrival_confirm: "Konfirmasi Kedatangan Gudang",
  }
};

export const getTranslation = (key, lang = 'id') => {
  return translations[lang][key] || key;
};
