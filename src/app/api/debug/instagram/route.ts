import { NextResponse } from 'next/server';

export async function GET() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken || accessToken === 'TU_INSTAGRAM_ACCESS_TOKEN_AQUI') {
    return NextResponse.json({ error: 'Missing or invalid Instagram Access Token' }, { status: 400 });
  }

  try {
    // 1. Get the Instagram Business Account ID from the Page Token
    const pageUrl = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${accessToken}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    if (pageData.error) {
      return NextResponse.json({ status: 'API_ERROR', error: pageData.error });
    }

    const igUserId = pageData.instagram_business_account?.id;
    if (!igUserId) {
      return NextResponse.json({ status: 'NO_IG_ACCOUNT', message: 'No Instagram Business Account linked to this Page Token.' });
    }

    // 2. Fetch media from the IG Business Account
    const mediaUrl = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,media_product_type&access_token=${accessToken}`;
    
    const res = await fetch(mediaUrl);
    const data = await res.json();
    
    if (data.error) {
       return NextResponse.json({ status: 'API_ERROR', error: data.error });
    }

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ status: 'EMPTY_ACCOUNT', message: 'API Connected, but no media found on this account.' });
    }

    const reels = data.data.filter((item: any) => item.media_product_type === 'REELS');
    
    if (reels.length === 0) {
        return NextResponse.json({ 
            status: 'NO_REELS', 
            total_media: data.data.length,
            sample_media_types: data.data.map((m: any) => m.media_product_type || m.media_type)
        });
    }

    // 3. Test insights for the first reel (using new non-deprecated metric)
    const firstReel = reels[0];
    const insightsUrl = `https://graph.facebook.com/v19.0/${firstReel.id}/insights?metric=views,likes,comments&access_token=${accessToken}`;
    const insightRes = await fetch(insightsUrl);
    const insightData = await insightRes.json();
    
    return NextResponse.json({
        status: 'SUCCESS',
        ig_business_account_id: igUserId,
        total_reels_found: reels.length,
        sample_reel: {
            id: firstReel.id,
            caption: firstReel.caption,
        },
        insight_test: insightData
    });

  } catch (error: any) {
    return NextResponse.json({ status: 'NETWORK_ERROR', error: error.message }, { status: 500 });
  }
}
