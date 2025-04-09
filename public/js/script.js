document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("onboardingForm");
    const submitButton = document.getElementById("submitButton");
    const submitText = document.getElementById("submitText");
    const submitSpinner = document.getElementById("submitSpinner");
  
    // Add floating label functionality
    document.querySelectorAll('input, textarea, select').forEach(input => {
      // Check if already filled on page load
      if (input.value) {
        input.classList.add('input-filled');
      }
      
      // Add event listeners
      input.addEventListener('input', () => {
        if (input.value) {
          input.classList.add('input-filled');
        } else {
          input.classList.remove('input-filled');
        }
      });
      
      input.addEventListener('focus', () => {
        if (input.value) {
          input.classList.add('input-filled');
        }
      });
      
      input.addEventListener('blur', () => {
        if (!input.value) {
          input.classList.remove('input-filled');
        }
      });
    });
  
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
  
        // Retrieve input values from the form
        const eid = document.getElementById("eid").value;
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const managerName = document.getElementById("managerName").value;
        const managerEmail = document.getElementById("managerEmail").value;
        const projectId = document.getElementById("projectId").value;
  
        // Validate input fields
        if (!eid || !name || !email || !managerName || !managerEmail || !projectId) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Form',
                text: 'Please fill in all required fields.',
                confirmButtonColor: '#4CAF50'
            });
            return;
        }
  
        try {
            // Show loading state
            submitButton.disabled = true;
            submitText.textContent = "Processing...";
            submitSpinner.classList.remove("hidden");
  
            // Send form data to the server via POST request
            const response = await fetch("/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    eid, 
                    name, 
                    email, 
                    managerName, 
                    managerEmail, 
                    projectId 
                }),
            });
  
            const data = await response.text();
  
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: data,
                    confirmButtonColor: '#4CAF50',
                    customClass: {
                      popup: 'animate__animated animate__bounceIn'
                    }
                });
                form.reset();
                document.querySelectorAll('input, textarea, select').forEach(input => {
                  input.classList.remove('input-filled');
                });
            } else {
                throw new Error(data);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to onboard employee.',
                confirmButtonColor: '#FF5722'
            });
            console.error("Error:", error);
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitText.textContent = "Onboard Employee";
            submitSpinner.classList.add("hidden");
        }
    });
  });