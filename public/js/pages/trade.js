import { checkUserStatus } from '../auth/auth.js'
import { db, collection, getDocs } from '../api/firebase-client.js'

const currentUser  =  await checkUserStatus();

// 1. Load all user
const allUsers =  await loadAllUsers();
// 2. Filter by searched user

// 4. Create UI component
// 5. Show user

// 1. Get the searched user from search bar
const searchUserInput = document.getElementById('search-user');

if (searchUserInput) {
    searchUserInput.addEventListener('input', (e) => {
       const searchTerm = e.target.value.toLowerCase().trim();
       filterUsersByUsername(allUsers, searchTerm);
    })
}

async function loadAllUsers() {
    try {
        const usersCollectionRef = collection(db, "userProfiles");
        const querySnapshot = await getDocs(usersCollectionRef);

        const users = [];
        querySnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            })
        });

        return users;
    } catch (error) {
        console.error("Failed trying to load users!", error);
        return [];
    }
    

    
}

function filterUsersByUsername(allUsers, searchTerm) {
    console.log("All users: ", allUsers);
    console.log(`searching for user ${searchTerm} `);
    // if array return emtpy
    if (allUsers.length === 0) {
        console.log("No user found!");
    } else {
        return allUsers.filter(user => {
            const username = user.Username || "";
            return username.toLowerCase().startsWith(searchTerm);
       });

       
       

    }
    



}

// 2. Create search query


// 3. Search firebase for that user

// 4. Return user information

// 5. Show in UI
