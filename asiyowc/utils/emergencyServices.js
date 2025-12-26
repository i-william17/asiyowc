export const emergencyServicesByCountry = {
  Kenya: [
    { name: "Police", number: "999" },
    { name: "National Emergency", number: "112" },
    { name: "GBV Helpline", number: "1195" },
  ],

  Nigeria: [
    { name: "Police / Emergency", number: "112" },
  ],

  USA: [
    { name: "Emergency Services", number: "911" },
  ],

  UK: [
    { name: "Emergency Services", number: "999" },
  ],
};

/* ================= FALLBACK ================= */
export const getEmergencyServices = (country) => {
  return (
    emergencyServicesByCountry[country] || [
      { name: "Global Emergency", number: "112" },
    ]
  );
};
