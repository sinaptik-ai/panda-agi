// WMF 2025 Speakers Data
const speakersData = [
    {
        name: "Elon Musk",
        title: "CEO",
        company: "Tesla, SpaceX",
        expertise: ["Artificial Intelligence", "Space Technology", "Electric Vehicles", "Innovation"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Satya Nadella",
        title: "Chairman and CEO",
        company: "Microsoft",
        expertise: ["Cloud Computing", "Artificial Intelligence", "Digital Transformation", "Leadership"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Sundar Pichai",
        title: "CEO",
        company: "Alphabet Inc. (Google)",
        expertise: ["Artificial Intelligence", "Search Technology", "Mobile Computing", "Cloud Services"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Tim Cook",
        title: "CEO",
        company: "Apple Inc.",
        expertise: ["Consumer Electronics", "Design", "Supply Chain", "Privacy"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Jensen Huang",
        title: "CEO",
        company: "NVIDIA",
        expertise: ["Graphics Processing", "Artificial Intelligence", "Gaming", "Data Centers"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Marc Benioff",
        title: "Chairman and CEO",
        company: "Salesforce",
        expertise: ["Cloud Computing", "CRM", "Digital Transformation", "Philanthropy"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Andy Jassy",
        title: "CEO",
        company: "Amazon",
        expertise: ["Cloud Computing", "E-commerce", "Digital Services", "Logistics"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Dara Khosrowshahi",
        title: "CEO",
        company: "Uber",
        expertise: ["Mobility", "Logistics", "Platform Economy", "Transportation"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Daniel Ek",
        title: "CEO",
        company: "Spotify",
        expertise: ["Music Streaming", "Audio Technology", "Content Creation", "Subscription Models"],
        country: "Sweden",
        role: "CEO"
    },
    {
        name: "Patrick Collison",
        title: "CEO",
        company: "Stripe",
        expertise: ["Fintech", "Payment Processing", "Digital Commerce", "Financial Infrastructure"],
        country: "Ireland",
        role: "CEO"
    },
    {
        name: "Brian Chesky",
        title: "CEO",
        company: "Airbnb",
        expertise: ["Sharing Economy", "Travel Technology", "Community Building", "Design"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Reed Hastings",
        title: "Co-founder",
        company: "Netflix",
        expertise: ["Streaming Technology", "Content Strategy", "Global Expansion", "Data Analytics"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Melanie Perkins",
        title: "CEO",
        company: "Canva",
        expertise: ["Design Technology", "User Experience", "Creative Tools", "Democratization"],
        country: "Australia",
        role: "CEO"
    },
    {
        name: "Whitney Wolfe Herd",
        title: "CEO",
        company: "Bumble",
        expertise: ["Social Technology", "Women Empowerment", "Dating Apps", "Community Building"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Demis Hassabis",
        title: "CEO",
        company: "DeepMind",
        expertise: ["Artificial Intelligence", "Machine Learning", "Neuroscience", "Research"],
        country: "United Kingdom",
        role: "CEO"
    },
    {
        name: "Fei-Fei Li",
        title: "Professor",
        company: "Stanford University",
        expertise: ["Computer Vision", "Artificial Intelligence", "Machine Learning", "Ethics"],
        country: "United States",
        role: "Professor"
    },
    {
        name: "Yann LeCun",
        title: "Chief AI Scientist",
        company: "Meta",
        expertise: ["Deep Learning", "Computer Vision", "Neural Networks", "AI Research"],
        country: "France",
        role: "Scientist"
    },
    {
        name: "Geoffrey Hinton",
        title: "Professor Emeritus",
        company: "University of Toronto",
        expertise: ["Deep Learning", "Neural Networks", "Machine Learning", "AI Safety"],
        country: "Canada",
        role: "Professor"
    },
    {
        name: "Yoshua Bengio",
        title: "Professor",
        company: "University of Montreal",
        expertise: ["Deep Learning", "Machine Learning", "AI Ethics", "Research"],
        country: "Canada",
        role: "Professor"
    },
    {
        name: "Andrew Ng",
        title: "Founder",
        company: "Coursera, Landing AI",
        expertise: ["Machine Learning", "Online Education", "AI Applications", "Entrepreneurship"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Kai-Fu Lee",
        title: "Chairman and CEO",
        company: "Sinovation Ventures",
        expertise: ["Artificial Intelligence", "Venture Capital", "Technology Investment", "China Tech"],
        country: "China",
        role: "CEO"
    },
    {
        name: "Ginni Rometty",
        title: "Former CEO",
        company: "IBM",
        expertise: ["Enterprise Technology", "Digital Transformation", "Leadership", "Innovation"],
        country: "United States",
        role: "Executive"
    },
    {
        name: "Susan Wojcicki",
        title: "Former CEO",
        company: "YouTube",
        expertise: ["Video Technology", "Content Platforms", "Digital Media", "Advertising"],
        country: "United States",
        role: "Executive"
    },
    {
        name: "Sheryl Sandberg",
        title: "Former COO",
        company: "Meta",
        expertise: ["Digital Advertising", "Social Media", "Leadership", "Women in Tech"],
        country: "United States",
        role: "Executive"
    },
    {
        name: "Reid Hoffman",
        title: "Co-founder",
        company: "LinkedIn",
        expertise: ["Professional Networks", "Venture Capital", "Entrepreneurship", "Platform Strategy"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Jack Dorsey",
        title: "Co-founder",
        company: "Twitter, Block",
        expertise: ["Social Media", "Financial Technology", "Decentralization", "Digital Payments"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Drew Houston",
        title: "CEO",
        company: "Dropbox",
        expertise: ["Cloud Storage", "File Sharing", "Productivity Tools", "Remote Work"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Stewart Butterfield",
        title: "Co-founder",
        company: "Slack",
        expertise: ["Workplace Communication", "Collaboration Tools", "Remote Work", "Productivity"],
        country: "Canada",
        role: "Founder"
    },
    {
        name: "Eric Yuan",
        title: "CEO",
        company: "Zoom",
        expertise: ["Video Communications", "Remote Work", "Enterprise Software", "User Experience"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Tony Xu",
        title: "CEO",
        company: "DoorDash",
        expertise: ["Food Delivery", "Logistics", "On-demand Services", "Local Commerce"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Logan Green",
        title: "CEO",
        company: "Lyft",
        expertise: ["Ride Sharing", "Transportation", "Urban Mobility", "Sustainability"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Apoorva Mehta",
        title: "Founder",
        company: "Instacart",
        expertise: ["Grocery Delivery", "E-commerce", "Logistics", "Consumer Technology"],
        country: "Canada",
        role: "Founder"
    },
    {
        name: "Katrina Lake",
        title: "Founder",
        company: "Stitch Fix",
        expertise: ["Fashion Technology", "Personalization", "Data Science", "E-commerce"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Julia Hartz",
        title: "CEO",
        company: "Eventbrite",
        expertise: ["Event Technology", "Ticketing", "Community Building", "Small Business"],
        country: "United States",
        role: "CEO"
    },
    {
        name: "Leah Busque",
        title: "Founder",
        company: "TaskRabbit",
        expertise: ["Gig Economy", "On-demand Services", "Local Services", "Platform Economy"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Reshma Saujani",
        title: "Founder",
        company: "Girls Who Code",
        expertise: ["Tech Education", "Diversity", "Women in Tech", "Coding Education"],
        country: "United States",
        role: "Founder"
    },
    {
        name: "Kiran Mazumdar-Shaw",
        title: "Executive Chairperson",
        company: "Biocon",
        expertise: ["Biotechnology", "Healthcare", "Pharmaceuticals", "Innovation"],
        country: "India",
        role: "Executive"
    },
    {
        name: "Radhika Gupta",
        title: "CEO",
        company: "Edelweiss Asset Management",
        expertise: ["Financial Services", "Asset Management", "Investment", "Fintech"],
        country: "India",
        role: "CEO"
    },
    {
        name: "Nandan Nilekani",
        title: "Co-founder",
        company: "Infosys",
        expertise: ["Digital Identity", "Government Technology", "Financial Inclusion", "Software Services"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Byju Raveendran",
        title: "Founder",
        company: "BYJU'S",
        expertise: ["EdTech", "Online Learning", "Educational Technology", "Digital Education"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Ritesh Agarwal",
        title: "Founder",
        company: "OYO",
        expertise: ["Hospitality Technology", "Travel", "Budget Hotels", "Platform Economy"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Vijay Shekhar Sharma",
        title: "Founder",
        company: "Paytm",
        expertise: ["Digital Payments", "Fintech", "Mobile Commerce", "Financial Services"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Kunal Bahl",
        title: "Co-founder",
        company: "Snapdeal",
        expertise: ["E-commerce", "Marketplace", "Digital Commerce", "Entrepreneurship"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Sachin Bansal",
        title: "Co-founder",
        company: "Flipkart",
        expertise: ["E-commerce", "Digital Payments", "Technology Investment", "Entrepreneurship"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Binny Bansal",
        title: "Co-founder",
        company: "Flipkart",
        expertise: ["E-commerce", "Technology", "Operations", "Scaling"],
        country: "India",
        role: "Founder"
    },
    {
        name: "Masayoshi Son",
        title: "Chairman and CEO",
        company: "SoftBank",
        expertise: ["Technology Investment", "Venture Capital", "Telecommunications", "AI Investment"],
        country: "Japan",
        role: "CEO"
    },
    {
        name: "Hiroshi Mikitani",
        title: "Chairman and CEO",
        company: "Rakuten",
        expertise: ["E-commerce", "Internet Services", "Digital Transformation", "Fintech"],
        country: "Japan",
        role: "CEO"
    },
    {
        name: "Zhang Yiming",
        title: "Founder",
        company: "ByteDance",
        expertise: ["Social Media", "Content Algorithms", "Short Video", "Global Expansion"],
        country: "China",
        role: "Founder"
    },
    {
        name: "Lei Jun",
        title: "Founder and CEO",
        company: "Xiaomi",
        expertise: ["Consumer Electronics", "Mobile Technology", "IoT", "Hardware"],
        country: "China",
        role: "CEO"
    },
    {
        name: "Jack Ma",
        title: "Co-founder",
        company: "Alibaba",
        expertise: ["E-commerce", "Digital Payments", "Cloud Computing", "Entrepreneurship"],
        country: "China",
        role: "Founder"
    },
    {
        name: "Pony Ma",
        title: "Chairman and CEO",
        company: "Tencent",
        expertise: ["Social Media", "Gaming", "Digital Entertainment", "Internet Services"],
        country: "China",
        role: "CEO"
    },
    {
        name: "Robin Li",
        title: "Co-founder and CEO",
        company: "Baidu",
        expertise: ["Search Technology", "Artificial Intelligence", "Autonomous Driving", "Cloud Computing"],
        country: "China",
        role: "CEO"
    }
];

// Global variables
let filteredSpeakers = [...speakersData];
let searchInput, countryFilter, expertiseFilter, roleFilter, speakersGrid, noResults;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    populateFilters();
    renderSpeakers();
    setupEventListeners();
    updateStats();
});

// Initialize DOM elements
function initializeElements() {
    searchInput = document.getElementById('searchInput');
    countryFilter = document.getElementById('countryFilter');
    expertiseFilter = document.getElementById('expertiseFilter');
    roleFilter = document.getElementById('roleFilter');
    speakersGrid = document.getElementById('speakersGrid');
    noResults = document.getElementById('noResults');
}

// Populate filter dropdowns
function populateFilters() {
    // Get unique countries
    const countries = [...new Set(speakersData.map(speaker => speaker.country))].sort();
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });

    // Get unique expertise areas
    const expertiseAreas = [...new Set(speakersData.flatMap(speaker => speaker.expertise))].sort();
    expertiseAreas.forEach(expertise => {
        const option = document.createElement('option');
        option.value = expertise;
        option.textContent = expertise;
        expertiseFilter.appendChild(option);
    });

    // Get unique roles
    const roles = [...new Set(speakersData.map(speaker => speaker.role))].sort();
    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role;
        roleFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    searchInput.addEventListener('input', debounce(filterSpeakers, 300));
    countryFilter.addEventListener('change', filterSpeakers);
    expertiseFilter.addEventListener('change', filterSpeakers);
    roleFilter.addEventListener('change', filterSpeakers);
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Filter speakers based on search and filters
function filterSpeakers() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCountry = countryFilter.value;
    const selectedExpertise = expertiseFilter.value;
    const selectedRole = roleFilter.value;

    filteredSpeakers = speakersData.filter(speaker => {
        // Search filter
        const matchesSearch = !searchTerm || 
            speaker.name.toLowerCase().includes(searchTerm) ||
            speaker.company.toLowerCase().includes(searchTerm) ||
            speaker.title.toLowerCase().includes(searchTerm) ||
            speaker.expertise.some(exp => exp.toLowerCase().includes(searchTerm));

        // Country filter
        const matchesCountry = !selectedCountry || speaker.country === selectedCountry;

        // Expertise filter
        const matchesExpertise = !selectedExpertise || speaker.expertise.includes(selectedExpertise);

        // Role filter
        const matchesRole = !selectedRole || speaker.role === selectedRole;

        return matchesSearch && matchesCountry && matchesExpertise && matchesRole;
    });

    renderSpeakers();
    updateStats();
}

// Render speakers grid
function renderSpeakers() {
    if (filteredSpeakers.length === 0) {
        speakersGrid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    speakersGrid.style.display = 'grid';
    noResults.style.display = 'none';

    speakersGrid.innerHTML = filteredSpeakers.map(speaker => `
        <div class="speaker-card" tabindex="0" role="button" aria-label="Speaker: ${speaker.name}">
            <h3 class="speaker-name">${speaker.name}</h3>
            <p class="speaker-title">${speaker.title}</p>
            <p class="speaker-company">${speaker.company}</p>
            <div class="speaker-expertise">
                <div class="expertise-tags">
                    ${speaker.expertise.map(exp => `<span class="expertise-tag">${exp}</span>`).join('')}
                </div>
            </div>
            <div class="speaker-location">
                <svg class="location-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
                <span>${speaker.country}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers for accessibility
    const speakerCards = speakersGrid.querySelectorAll('.speaker-card');
    speakerCards.forEach(card => {
        card.addEventListener('click', handleSpeakerClick);
        card.addEventListener('keydown', handleSpeakerKeydown);
    });
}

// Handle speaker card click
function handleSpeakerClick(event) {
    const speakerName = event.currentTarget.querySelector('.speaker-name').textContent;
    // You could implement a modal or detailed view here
    console.log(`Clicked on speaker: ${speakerName}`);
}

// Handle speaker card keyboard navigation
function handleSpeakerKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSpeakerClick(event);
    }
}

// Update statistics
function updateStats() {
    const totalSpeakersElement = document.getElementById('totalSpeakers');
    const totalCountriesElement = document.getElementById('totalCountries');
    const totalCompaniesElement = document.getElementById('totalCompanies');

    if (totalSpeakersElement) {
        totalSpeakersElement.textContent = filteredSpeakers.length;
    }

    if (totalCountriesElement) {
        const uniqueCountries = new Set(filteredSpeakers.map(speaker => speaker.country));
        totalCountriesElement.textContent = uniqueCountries.size;
    }

    if (totalCompaniesElement) {
        const uniqueCompanies = new Set(filteredSpeakers.map(speaker => speaker.company));
        totalCompaniesElement.textContent = uniqueCompanies.size;
    }
}

// Utility function to get random speakers (for demo purposes)
function getRandomSpeakers(count = 10) {
    const shuffled = [...speakersData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Export functions for potential external use
window.WMFSpeakers = {
    getAllSpeakers: () => speakersData,
    getFilteredSpeakers: () => filteredSpeakers,
    searchSpeakers: (term) => {
        searchInput.value = term;
        filterSpeakers();
    },
    filterByCountry: (country) => {
        countryFilter.value = country;
        filterSpeakers();
    },
    clearFilters: () => {
        searchInput.value = '';
        countryFilter.value = '';
        expertiseFilter.value = '';
        roleFilter.value = '';
        filterSpeakers();
    }
};