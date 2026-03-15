const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function extractSystemUserTokens() {
  console.log('🔄 ==============================================');
  console.log('🔄 EXTRACTING PAGE TOKEN FROM SYSTEM USER');
  console.log('🔄 ==============================================\n');
  
  try {
    // 1. A System User token is a "User" token. We must ask it: "What Pages do you control?"
    console.log('1️⃣ Querying Pages assigned to this System User...');
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();
    
    if (accountsData.error) {
        console.error('❌ Error hitting me/accounts:', accountsData.error.message);
        return;
    }

    if (!accountsData.data || accountsData.data.length === 0) {
        console.log('❌ This System User has NO pages assigned to it! You forgot Step 4 (Add Assets -> Pages).');
        return;
    }

    console.log(`✅ Found ${accountsData.data.length} Page(s) assigned to this System User!`);
    
    for (const page of accountsData.data) {
        console.log(`\n📄 Page Name: ${page.name}`);
        console.log(`🆔 Page ID: ${page.id}`);
        console.log(`🔑 PAGE ACCESS TOKEN: ${page.access_token.substring(0, 20)}...[Hidden]`);
        
        // Let's test this specific Page Token to see if it grabs the Instagram ID
        console.log(`\n2️⃣ Testing this Page Token for Instagram connection...`);
        const igUrl = `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
        const igRes = await fetch(igUrl);
        const igData = await igRes.json();
        
        if (igData.instagram_business_account) {
            console.log(`✅ SUCCESS! Found Instagram Business Account: ${igData.instagram_business_account.id}`);
            console.log(`\n🎉 THIS IS YOUR FINAL TOKEN. Put this in your .env.local:`);
            console.log(`INSTAGRAM_ACCESS_TOKEN=${page.access_token}`);
        } else {
             console.log(`❌ Page ${page.name} does NOT have an Instagram account connected to it.`);
        }
    }

  } catch (error) {
    console.error('Network error:', error);
  }
}

extractSystemUserTokens();
