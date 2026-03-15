const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function checkTokenIdentity() {
  console.log('🔍 Diagnostic: Checking Token Identity...\n');
  
  try {
    // 1. Check who this token belongs to
    const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,accounts&access_token=${accessToken}`;
    const meRes = await fetch(meUrl);
    const meData = await meRes.json();
    
    console.log('--- Token Identity ---');
    if (meData.error) {
        console.error('Error getting identity:', meData.error.message);
        return;
    }
    console.log(`👤 Name: ${meData.name}`);
    console.log(`🆔 ID: ${meData.id}`);
    
    // 2. See if this token can 'see' any Pages (which implies it's a User token that can manage pages)
    if (meData.accounts && meData.accounts.data) {
        console.log(`\n📋 Pages managed by this User (${meData.accounts.data.length} found):`);
        meData.accounts.data.forEach(page => {
            console.log(`   - 📄 Page Name: ${page.name}`);
            console.log(`     🆔 Page ID: ${page.id}`);
            console.log(`     🔑 Page Token: ${page.access_token.substring(0, 20)}...`);
            console.log('     --------------------------------------------------');
        });
        
        if (meData.accounts.data.length > 0) {
            console.log('\n🚨 DIAGNOSIS: You gave me the USER TOKEN, but the API needs the PAGE TOKEN.');
            console.log('The "Page Token" is the one listed above starting with "EAA...".');
            console.log('Try using THAT token instead!');
        }
    } else {
        console.log('\n❌ This token cannot see any Pages. It is purely a personal profile token.');
    }

  } catch (error) {
    console.error('Network error during check:', error);
  }
}

checkTokenIdentity();
