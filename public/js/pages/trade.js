import { checkUserStatus } from '../auth/auth.js'
import { db, collection, getDocs } from '../api/firebase-client.js'


const tradeCardHTML = (userImg, userAlt,username, userVerified, userAt,rating, startDate, activeItemsCount, totalTrades ) => `
        <div class="user-card-header">
                        <div class="user-pic">
                            <img
                                src="${userImg}" 
                                alt=${userAlt}
                                width="60"
                                height="60"
                                
                            >
                            
                        </div>
                    </div>
                    
                    <div class="user-details">
                        <div class="user-id">
                            <h3 class="user-name">${username}</h3>
                            <span class="verified-badge" title="Verified user">
                               ${userVerified ? '<i class="fa-solid fa-circle-check"></i>' : ""} 
                            </span>
                            <span class="user-at">@${userAt}</span>
                    </div>

                        

                        <div class="user-info">
                            <div class="rating" title="Average rating">
                                <i class="fa-solid fa-star" aria-hidden="true"></i>
                                <span>${rating}</span>
                            </div>
                            <div class="user-trades">
                                <p>${totalTrades} trades</p>
                            </div>
                            <div class="user-start-date">
                                <p>Since ${startDate}</p>
                            </div>
                        </div>
                        <div class="user-items">
                            <p class="items-count">
                                <i class="fa-solid fa-box" aria-hidden="true"></i>
                                ${activeItemsCount} active items
                            </p>
                        </div>
        </div>

`;
const currentUser  =  await checkUserStatus();
const allUsers =  await loadAllUsers();
const usersGrid = document.getElementById('usersGrid');

displayUsers(allUsers);

if (usersGrid) {
    usersGrid.addEventListener('click', handleUserCardClick);
}

const searchUserInput = document.getElementById('search-user');
if (searchUserInput) {
    searchUserInput.addEventListener('input', (e) => {
       const searchTerm = e.target.value.trim();
       const results = filterUsersByUsername(allUsers, searchTerm);
       displayUsers(results);
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
    if (!allUsers || !Array.isArray(allUsers)) {
        console.error("allUser must be an array");
        return [];
    } 
     
    if (allUsers.length === 0) {
        console.log("No users available to filter");
        return [];
    }

    if (!currentUser || !currentUser.uid) {
        console.error("filterUsersByUsername: currentUser is not available");
        return allUsers;
    }

    if (!searchTerm || typeof searchTerm !== 'string') {
        searchTerm = "";
    }

    const cleanSearchTerm = searchTerm.trim().toLowerCase();

    return allUsers.filter(user => {
            
        if (user.id === currentUser.email) {
            return false;
        }

        if (cleanSearchTerm === "") {
            return true;
        }

        const username = user.username || "";
        return username.toLowerCase().startsWith(cleanSearchTerm);
    });
    
    
}

function displayUsers(users) {
    console.log("username:",users)
    if (!users || users.length === 0) {
        usersGrid.innerHTML = 
        `
            <div style="text-align: center; color: #525252;">No users found!</div>
        `;
        return;
    }

    usersGrid.innerHTML = "";

    users.forEach(user => {
        const element = document.createElement('article');
        element.className = 'user-card';
        element.dataset.userId =  user.id;

        const totalTrades = user.sellerOverview.productsSold || 0;
        const activeItems = user.sellerOverview.activeListing || 0;
        const rating = user.sellerOverview.sellerRating || 5;
        const joinYear = user.accountInfo?.joinedDate 
            ? new Date(user.accountInfo.joinedDate.toDate()).getFullYear()
            : 'N/A' || '2026'


        element.innerHTML = tradeCardHTML(
            "/images/default-avatar.svg",
            user.username,
            user.username,
            user.accountInfo.isVerified,
            user.username,
            rating,
            joinYear,
            activeItems,
            totalTrades
        );

        usersGrid.appendChild(element);

    })

}

function handleUserCardClick(e) {
    const card = e.target.closest('.user-card');
    if (!card) return;

    const userId = card.dataset.userId;
    if (!userId) {
        console.error('No userId found');
        return;
    }

    window.location.href = `/trade-request?with=${userId}`;
}





