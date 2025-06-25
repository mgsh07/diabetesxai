function predict() {
  const inputData = {
    Pregnancies: parseFloat(document.getElementById("Pregnancies").value) || 0,
    Glucose: parseFloat(document.getElementById("Glucose").value) || 0,
    BloodPressure: parseFloat(document.getElementById("BloodPressure").value) || 0,
    SkinThickness: parseFloat(document.getElementById("SkinThickness").value) || 0,
    Insulin: parseFloat(document.getElementById("Insulin").value) || 0,
    BMI: parseFloat(document.getElementById("BMI").value) || 0,
    DiabetesPedigreeFunction: parseFloat(document.getElementById("DiabetesPedigreeFunction").value) || 0,
    Age: parseFloat(document.getElementById("Age").value) || 0,
  };

  const patientName = document.getElementById("name").value || "Unknown";
  const patientDOB = document.getElementById("dob").value || "N/A";

  fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputData),
  })
    .then((res) => res.json())
    .then((data) => {
      const resultDiv = document.getElementById("result");
      resultDiv.style.display = "block";

      // Show Result Text + Prediction
      resultDiv.innerHTML = `
        <h2>🎯 Prediction Result</h2>
        <p><strong>Patient Name:</strong> ${patientName}</p>
        <p><strong>Date of Birth:</strong> ${patientDOB}</p>
        <p><strong>Age:</strong> ${inputData.Age}</p>
        <h3 style="color:${data.prediction === 1 ? "red" : "green"};">
          ${data.prediction === 1 ? "🟥 Diabetes Detected" : "🟩 No Diabetes"}
        </h3>
        <p><strong>Probability (No Diabetes):</strong> ${data.proba[0].toFixed(2)}</p>
        <p><strong>Probability (Diabetes):</strong> ${data.proba[1].toFixed(2)}</p>

        <h4 style="margin-top:20px;">🧠 Explainable AI Contributions (LIME):</h4>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#e3f2fd;">
              <th style="text-align:left;padding:8px;">Feature</th>
              <th style="text-align:right;padding:8px;">Contribution</th>
            </tr>
          </thead>
          <tbody>
            ${data.lime_values.map(v => `
              <tr>
                <td style="padding:8px;">${v.feature}</td>
                <td style="padding:8px;text-align:right;color:${v.value > 0 ? 'red' : 'green'};">
                  ${v.value.toFixed(3)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Charts block
      document.querySelector(".charts").style.display = "flex";

      // Radar chart features
      const radarFeatures = [
        "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
        "Insulin", "BMI", "DiabetesPedigreeFunction", "Age"
      ];

      // Plot LIME
      Plotly.newPlot("lime-bar", [{
        x: data.lime_values.map(x => x.value),
        y: data.lime_values.map(x => x.feature),
        type: "bar",
        orientation: "h",
        marker: {
          color: data.lime_values.map(v => v.value > 0 ? "#e74c3c" : "#2ecc71")
        }
      }], {
        title: "🔍 Feature Contributions (LIME)",
        yaxis: { autorange: "reversed" },
        margin: { l: 180, r: 40, t: 50, b: 50 },
        width: 950,
        height: 450
      }, { staticPlot: true });

      // Radar
      Plotly.newPlot("radar-chart", [
        {
          type: "scatterpolar",
          r: data.patient_values,
          theta: radarFeatures,
          fill: "toself",
          name: "Patient",
          line: { color: "#1abc9c", width: 3 }
        },
        {
          type: "scatterpolar",
          r: data.avg_values,
          theta: radarFeatures,
          fill: "toself",
          name: "Population Avg",
          line: { color: "#95a5a6", dash: "dot" }
        }
      ], {
        title: "🧭 Patient vs Population",
        width: 950,
        height: 450,
        polar: {
          radialaxis: {
            visible: true,
            range: [0, Math.max(...data.avg_values, ...data.patient_values) + 10]
          }
        },
        showlegend: true
      }, { staticPlot: true });

      // Heatmap
      Plotly.newPlot("corr-heatmap", [{
        z: data.corr_matrix,
        x: radarFeatures,
        y: radarFeatures,
        type: "heatmap",
        colorscale: "RdBu",
        zmin: -1,
        zmax: 1
      }], {
        title: "🔥 Feature Correlation Matrix",
        width: 950,
        height: 450
      }, { staticPlot: true });

      // Distribution chart
      Plotly.newPlot("dist-chart", [
        {
          x: data.dist_values,
          type: "histogram",
          opacity: 0.6,
          name: "Population",
          marker: { color: "#3498db" }
        },
        {
          x: [data.patient_values[radarFeatures.indexOf(data.selected_feature)]],
          type: "scatter",
          mode: "lines",
          name: "Patient",
          line: { color: "red", width: 4 }
        }
      ], {
        title: `📉 Distribution of ${data.selected_feature}`,
        width: 950,
        height: 450
      }, { staticPlot: true });

      // ✅ Update dynamic suggestions
      updateSuggestions(inputData, data.lime_values);
    })
    .catch((err) => {
      console.error(err);
      alert("❌ Error: Backend not responding. Make sure the Python server is running.");
    });
}


function updateSuggestions(inputData) {
  const tips = [];

  if (inputData.Glucose < 90)
    tips.push(" <strong>Glucose:</strong>  Eat fruits, whole grains & hydrate.");
  if (inputData.BloodPressure < 70)
    tips.push(" <strong>Blood Pressure:</strong> Add potassium-rich foods.");
  if (inputData.SkinThickness < 20)
    tips.push(" <strong>Skin Thickness:</strong> Balanced protein intake.");
  if (inputData.Insulin < 50)
    tips.push(" <strong>Insulin:</strong> Exercise and reduce sugar.");
  if (inputData.BMI > 30)
    tips.push(" <strong>BMI:</strong> Light workouts, reduce fatty foods.");
  if (inputData.DiabetesPedigreeFunction > 0.8)
    tips.push(" <strong>Genetic Risk:</strong> Annual checkups recommended.");
  if (inputData.Pregnancies > 4)
    tips.push(" <strong>Pregnancies:</strong> Monitor sugar levels.");
  if (inputData.Age > 50)
    tips.push(" <strong>Age:</strong> Get yearly health screenings.");

  const box = document.getElementById("suggestions");
  box.style.display = "block";
  box.innerHTML = `
    <h4>💡 Personalized Health Suggestions:</h4>
    <ul>
      ${tips.length > 0 ? tips.map(t => `<li>${t}</li>`).join("") : "<li>✅ All health parameters look good!</li>"}
    </ul>
  `;
}


function reset() {
  document.getElementById("result").style.display = "none";
  document.getElementById("suggestions").style.display = "none";
  document.querySelector(".charts").style.display = "none";
  document.querySelectorAll("input").forEach(el => el.value = "");
}