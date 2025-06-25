from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from pydantic import BaseModel
from lime.lime_tabular import LimeTabularExplainer
from sklearn.ensemble import RandomForestClassifier
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

df = pd.read_csv("diabetes.csv")
X = df.drop("Outcome", axis=1)
y = df["Outcome"]

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

explainer = LimeTabularExplainer(
    np.array(X),
    feature_names=X.columns.tolist(),
    class_names=["No Diabetes", "Diabetes"],
    mode="classification"
)

class InputData(BaseModel):
    Pregnancies: float
    Glucose: float
    BloodPressure: float
    SkinThickness: float
    Insulin: float
    BMI: float
    DiabetesPedigreeFunction: float
    Age: float

@app.post("/predict")
def predict(data: InputData):
    user_df = pd.DataFrame([data.dict()])
    pred = model.predict(user_df)[0]
    proba = model.predict_proba(user_df)[0]
    exp = explainer.explain_instance(user_df.iloc[0], model.predict_proba)
    lime_result = [{"feature": f, "value": float(w)} for f, w in exp.as_list()]
    
    return {
        "prediction": int(pred),
        "proba": proba.tolist(),
        "lime_values": lime_result,
        "patient_values": user_df.values[0].tolist(),
        "avg_values": X.mean().values.tolist(),
        "corr_matrix": df.corr().values.tolist(),
        "dist_values": df["Glucose"].tolist(),
        "selected_feature": "Glucose"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)