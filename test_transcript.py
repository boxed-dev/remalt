from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()
temp = ytt_api.fetch("Qgr6YK3iBtE")

# Extract only the text from all snippets
full_text = ' '.join([snippet.text for snippet in temp.snippets])
print(full_text)