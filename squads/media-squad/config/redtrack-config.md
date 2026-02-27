# RedTrack Configuration

## Overview

RedTrack é a plataforma central de tracking e atribuição para todas as campanhas do media-squad.

## Campaign Setup

### 1. Create Campaign in RedTrack
```
Campaign Name: {offer_id}-{platform}-{date}
Traffic Source: Meta Ads (or TikTok, Google, etc.)
Offer: Link to CPA offer or product URL
```

### 2. Tracking URL Structure
```
https://tracking.yourdomain.com/click?campaign_id={campaign_id}&...
```

**Parameters to include:**
- `campaign_id` - RedTrack campaign ID
- `creative_id` - Creative identifier
- `ad_id` - Platform ad ID
- `adset_id` - Platform adset ID
- `placement` - Platform placement (Facebook Feed, Instagram Stories, etc.)

### 3. Postback Configuration

#### Meta Ads Postback
```
Event: Purchase
URL: https://graph.facebook.com/v18.0/{pixel_id}/events
Method: POST
Parameters:
  - event_name: Purchase
  - event_time: {timestamp}
  - user_data: {hashed_email}, {hashed_phone}
  - custom_data: {value}, {currency}
  - event_source_url: {landing_page}
```

#### Conversion Postback (Offer → RedTrack)
```
URL: https://tracking.yourdomain.com/postback?...
Parameters:
  - click_id: {click_id}
  - payout: {payout}
  - status: {approved|pending|rejected}
  - transaction_id: {transaction_id}
```

## Integration Points

### Meta Ads API
- **Conversions API (CAPI):** Server-side event tracking
- **Offline Conversions:** Import offline sales
- **Custom Conversions:** Track specific actions

### RedTrack API
- **Campaign Creation:** Automated campaign setup
- **Stats Retrieval:** Pull performance data
- **Postback Management:** Configure conversion tracking

## Testing Flow

### 1. Test Conversion Event
1. Visit tracking URL
2. Complete conversion action on landing page
3. Verify event received in RedTrack
4. Verify postback sent to Meta
5. Check Meta Events Manager for received event

### 2. Attribution Verification
1. Run test campaign with $10 budget
2. Generate 1-2 test conversions
3. Wait 24h for attribution window
4. Compare conversions: RedTrack vs Meta vs Offer
5. Investigate discrepancies

## Common Issues

### Event Not Firing
- **Check:** Pixel installed correctly on landing page
- **Check:** Browser doesn't block tracking
- **Fix:** Use server-side tracking (CAPI)

### Attribution Mismatch
- **Cause:** Different attribution windows
- **Fix:** Align attribution windows (Meta: 7-day click, RedTrack: same)

### Postback Not Received
- **Check:** Postback URL is correct
- **Check:** Server can reach Meta API
- **Fix:** Check firewall, test with curl

## Best Practices

1. **Always test tracking before launching campaign**
2. **Use unique campaign_id per campaign**
3. **Include all relevant parameters in tracking URL**
4. **Monitor attribution daily**
5. **Keep backup of all postback configurations**
6. **Use server-side tracking when possible (CAPI)**
7. **Document any custom modifications**

## Security

### Access Tokens
- Store Meta access tokens securely (env variables)
- Rotate tokens regularly (every 60 days)
- Never commit tokens to git

### HTTPS Required
- All tracking URLs must use HTTPS
- Valid SSL certificate required
- Configure in RedTrack domain settings
