// frontend/investment.js
// Fix: was reading data.recommendedPlans but backend (InvestmentPage.js)
//      returned data.recommendedSchemes — key mismatch. Both are now unified
//      to 'recommendedPlans' (also fixed in investmentRoutes.js).

const BASE_URL = "http://localhost:5000/api";

async function loadPlans() {
    try {
        const res = await fetch(BASE_URL + "/investment/recommend", {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            document.getElementById("plans").innerHTML =
                "Not authorized. Please <a href='login.html'>login</a>.";
            return;
        }

        const data = await res.json();
        const container = document.getElementById("plans");
        container.innerHTML = "";

        container.innerHTML += `<h3>Your Monthly Savings Estimate: ₹${data.savings}</h3>`;

        if (!data.recommendedPlans || data.recommendedPlans.length === 0) {
            container.innerHTML += "<p>No investment plans available for your profile.</p>";
            return;
        }

        // Key fix: was data.recommendedPlans — now matches unified backend key
        data.recommendedPlans.forEach(plan => {
            container.innerHTML += `
                <div style="border:1px solid #ccc; padding:10px; margin:10px; border-radius:6px;">
                    <h4>${plan.schemeName}</h4>
                    <p><b>Organisation:</b> ${plan.organization}</p>
                    <p><b>Interest Rate:</b> ${plan.interestRate}%</p>
                    <p><b>Min Investment:</b> ₹${plan.minInvestment}</p>
                    <p><b>Max Investment:</b> ₹${plan.maxInvestment}</p>
                    <p><b>Lock-in Period:</b> ${plan.lockInYears} year(s)</p>
                    <p><b>Risk Level:</b> ${plan.riskLevel}</p>
                    <p><b>Liquidity:</b> ${plan.liquidity}</p>
                    <p><b>Category:</b> ${plan.category}</p>
                </div>
            `;
        });

    } catch (err) {
        console.error("Investment load error:", err);
        document.getElementById("plans").innerHTML =
            "Unable to connect to server. Please try again later.";
    }
}

// Auto-load on page open
window.addEventListener("DOMContentLoaded", loadPlans);