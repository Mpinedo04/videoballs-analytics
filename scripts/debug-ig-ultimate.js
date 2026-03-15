const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function runUltimateDiag() {
  console.log('🔄 ==============================================');
  console.log('🔄 ULTIMATE TOKENS AND CONNECTIONS DIAGNOSTIC');
  console.log('🔄 ==============================================\n');
  
  try {
    // 1. Check EXACTLY who this token claims to be
    console.log('1️⃣ Checking what this token actually is...');
    const debugUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();
    
    if (debugData.data) {
        console.log(`- Token Type: ${debugData.data.type}`);
        console.log(`- Valid: ${debugData.data.is_valid}`);
        console.log(`- Scopes (Permissions): ${debugData.data.scopes.join(', ')}`);
        console.log(`- Belongs to App ID: ${debugData.data.app_id}`);
        console.log(`- Belongs to Profile ID (User or Page): ${debugData.data.profile_id}`);
    } else {
        console.log('Could not debug token.', debugData);
    }

    console.log('\n2️⃣ Checking if this ID is a Page and testing Instagram connection...');
    const pageId = debugData.data?.profile_id || 'me';
    
    // We try to grab the Page's Name, its Instagram Business Account, OR if it's a User, its Accounts
    const entityUrl = `https://graph.facebook.com/v19.0/${pageId}?fields=name,instagram_business_account,accounts&access_token=${accessToken}`;
    const entityRes = await fetch(entityUrl);
    const entityData = await entityRes.json();

    console.log(`- Entity Name: ${entityData.name || 'Unknown'}`);
    
    if (entityData.instagram_business_account) {
        console.log(`✅ INSTAGRAM FOUND! ID: ${entityData.instagram_business_account.id}`);
    } else {
        console.log(`❌ NO INSTAGRAM FOUND directly attached to ${entityData.name || 'this ID'}.`);
        if (entityData.error) console.log(`   Error says: ${entityData.error.message}`);
    }

    if (entityData.accounts && entityData.accounts.data) {
        console.log(`\n3️⃣ Pssst... are there any OTHER Pages hidden inside? Found ${entityData.accounts.data.length}:`);
        for (const page of entityData.accounts.data) {
            console.log(`   - Page Name: ${page.name}`);
            console.log(`   - Page ID: ${page.id}`);
            
            // Try to see if THIS nested page has Instagram
            try {
                const nestedIgUrl = `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`;
                const nestedRes = await fetch(nestedIgUrl);
                const nestedData = await nestedRes.json();
                if (nestedData.instagram_business_account) {
                    console.log(`     ✅ BINGO! Nested page HAS Instagram! ID: ${nestedData.instagram_business_account.id}`);
                } else {
                    console.log(`     ❌ Nested page DOES NOT have Instagram.`);
                }
            } catch(e) { console.log('       Could not check nested IG.'); }
        }
    }

  } catch (error) {
    console.error('Network error:', error);
  }
}

runUltimateDiag();
