
async function loginUser() {

    const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: email.value,
            password: password.value
        })
    });

    const data = await res.json();

    localStorage.setItem("token", data.token);
}
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        userId: "123", 

        income: Number(income.value),
        investment: Number(investment.value),

        fixedExpenses: {
            rent: Number(rent.value),
            utilities: Number(utilities.value),
            insurance: Number(insurance.value)
        },

        variableExpenses: {
            groceries: Number(groceries.value),
            entertainment: Number(entertainment.value),
            transport: Number(transport.value)
        },

        debtRepayment: {
            emi: Number(emi.value),
            creditCard: Number(creditCard.value)
        },

        savingsGoal: Number(savings.value),
        totalExpenses,
        remaining
    };

    try {
        const res = await fetch("http://localhost:5000/api/budgetmaker/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            alert("Budget Saved to MongoDB ✅");
        }

    } catch (error) {
        console.log(error);
    }
});