// Vercel 서버리스 함수 (Node.js)
// 이 파일은 api/generate-content.js 에 저장됩니다.

// 외부 API 호출을 위한 fetch 함수
const fetch = require('node-fetch');

// API 키는 절대 코드에 직접 넣지 않고, Vercel 환경 변수에서 가져옵니다.
const API_KEY = process.env.API_KEY;

module.exports = async (req, res) => {
    // API 키가 설정되어 있는지 확인
    if (!API_KEY) {
        res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
        return;
    }

    try {
        const { type, userInput, base64Data, mimeType } = req.body;

        if (type === 'ocr') {
            // OCR 요청 처리
            const prompt = "이 이미지에서 텍스트를 추출해줘. 특히 설교 제목, 설교자, 구절, 찬양 목록 같은 정보를 정리해서 보여줘. 불필요한 정보는 제외해줘.";
            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data
                                }
                            }
                        ]
                    ],
                };
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'API 호출 실패');
            }

            const extractedText = result.candidates[0].content.parts[0].text;
            res.status(200).json({ extractedText });
        
        } else if (type === 'generation') {
            // 제목 및 설명 생성 요청 처리
            const chatHistory = [{ role: "user", parts: [{ text: `다음 텍스트에서 설교 제목, 설교자, 구절, 찬양 목록을 추출해줘. 찬양 목록은 각 찬양곡을 별도의 항목으로 분리해줘. 날짜 정보는 무시해도 돼.
텍스트:
${userInput}` }] }];

            const payload = {
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "sermonTitle": { "type": "STRING" },
                            "speaker": { "type": "STRING" },
                            "scripture": { "type": "STRING" },
                            "praiseSongs": {
                                "type": "ARRAY",
                                "items": { "type": "STRING" }
                            }
                        },
                        "required": ["sermonTitle", "speaker", "scripture", "praiseSongs"]
                    }
                }
            };
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'API 호출 실패');
            }

            const extractedData = JSON.parse(result.candidates[0].content.parts[0].text);
            res.status(200).json({ extractedData });
        } else {
            res.status(400).json({ error: '잘못된 요청 타입입니다.' });
        }

    } catch (error) {
        console.error('API 오류:', error);
        res.status(500).json({ error: `서버 오류 발생: ${error.message}` });
    }
};
