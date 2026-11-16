"""Versionable educational content. These are simulations, not entry-policy guidance."""
SCENARIOS = [
    {
        'id': 'prepare', 'title': '한국에서 여행 준비',
        'description': '출발 전에 챙길 것들을 차근차근 확인해요.', 'reward': 100,
        'steps': [
            {'id': 'documents', 'prompt': '출발 준비의 첫 단계! 여행 서류는 어떻게 확인할까요?',
             'options': [{'id': 'official', 'text': '여권과 여행 목적에 맞는 입국 요건을 공식 안내에서 확인한다'}, {'id': 'friend', 'text': '작년에 다녀온 친구의 경험만 믿는다'}, {'id': 'airport', 'text': '공항에 도착한 뒤 처음 확인한다'}],
             'correctOptionId': 'official', 'explanation': '입국 요건은 여행 시점과 개인 상황에 따라 달라질 수 있어요. 출발 전 공식 안내를 확인하고 여권·예약 내역을 준비하세요.'},
            {'id': 'connection', 'prompt': '현지에서 호텔 주소와 예약 내역을 바로 확인하려면?',
             'options': [{'id': 'memory', 'text': '호텔 이름을 기억해 두면 충분하다'}, {'id': 'offline', 'text': '중문 주소와 예약 내역을 오프라인으로 저장하고 통신 수단을 준비한다'}, {'id': 'later', 'text': '도착해서 다른 사람의 휴대전화를 빌린다'}],
             'correctOptionId': 'offline', 'explanation': '통신이 바로 연결되지 않을 때를 대비해 중문 주소, 예약 내역, 비상 연락처를 기기에 저장해 두세요.'},
            {'id': 'payment', 'prompt': '결제 앱을 준비할 때 알맞은 행동은?',
             'options': [{'id': 'verify', 'text': '공식 앱에서 본인 확인과 결제 수단 등록을 점검하고 대체 수단도 준비한다'}, {'id': 'share', 'text': '도움을 받으려고 인증번호를 다른 사람에게 보낸다'}, {'id': 'one', 'text': '한 가지 결제 방법만 준비한다'}],
             'correctOptionId': 'verify', 'explanation': '인증번호와 비밀번호는 공유하지 않아요. 결제 가능 여부는 카드와 서비스에 따라 다르므로 직접 확인하고 대체 수단을 챙겨요.'},
        ],
    },
    {
        'id': 'immigration', 'title': '입국심사 연습',
        'description': '입국심사관의 질문에 차분하게 대답해 봐요.', 'reward': 150,
        'steps': [
            {'id': 'purpose', 'prompt': '심사관: “What is the purpose of your visit?” 관광 목적의 여행이라면?',
             'options': [{'id': 'tourism', 'text': 'I am here for tourism. 관광하러 왔습니다.'}, {'id': 'work', 'text': 'I will work here. 여기서 일하려고 합니다.'}, {'id': 'ignore', 'text': '질문에 답하지 않고 지나간다'}],
             'correctOptionId': 'tourism', 'explanation': '실제 방문 목적을 짧고 정확하게 답해요. 이 연습의 설정은 관광 여행입니다.'},
            {'id': 'stay', 'prompt': '심사관: “Where will you stay?” 숙박 장소를 물으면?',
             'options': [{'id': 'unknown', 'text': '모른다고만 답한다'}, {'id': 'hotel', 'text': '예약한 호텔 이름과 중문 주소, 예약 확인서를 보여 준다'}, {'id': 'random', 'text': '기억나는 호텔 이름을 아무거나 말한다'}],
             'correctOptionId': 'hotel', 'explanation': '실제 예약 내역을 바탕으로 답하세요. 호텔 이름·주소와 귀국 일정 등을 미리 확인해 두면 도움이 됩니다.'},
            {'id': 'clarify', 'prompt': '질문을 잘 알아듣지 못했어요. 어떻게 말할까요?',
             'options': [{'id': 'yes', 'text': '무조건 Yes라고 답한다'}, {'id': 'repeat', 'text': 'Could you repeat that, please? 다시 말씀해 주시겠어요?'}, {'id': 'leave', 'text': '심사가 끝나기 전에 자리를 떠난다'}],
             'correctOptionId': 'repeat', 'explanation': '이해하지 못했다면 정중하게 반복을 요청하세요. 사실에 맞춰 답하고 심사관의 안내를 따릅니다.'},
        ],
    },
    {
        'id': 'hotel', 'title': '호텔 예약과 체크인',
        'description': '예약 조건을 비교하고 프런트에서 체크인해요.', 'reward': 150,
        'steps': [
            {'id': 'book', 'prompt': '상하이의 호텔 객실을 예약하려고 해요. 결제 전 확인할 내용은?',
             'options': [{'id': 'photo', 'text': '객실 사진만 확인한다'}, {'id': 'conditions', 'text': '날짜·인원·위치·취소 규정과 내 여권으로 투숙 가능한지 확인한다'}, {'id': 'cheap', 'text': '최저가라면 조건을 보지 않고 결제한다'}],
             'correctOptionId': 'conditions', 'explanation': '예약 조건과 투숙 가능 여부를 숙소에 확인해요. 이 체험은 실제 예약이나 결제를 진행하지 않습니다.'},
            {'id': 'checkin', 'prompt': '프런트: “您好，请问有预订吗？” 예약하셨나요?',
             'options': [{'id': 'reservation', 'text': '我有预订。이름과 예약 확인서를 보여 준다'}, {'id': 'room', 'text': '직원 확인 없이 바로 객실로 올라간다'}, {'id': 'card', 'text': '신용카드 비밀번호를 먼저 알려 준다'}],
             'correctOptionId': 'reservation', 'explanation': '“我有预订 (wǒ yǒu yùdìng)”은 “예약했습니다”라는 뜻이에요. 예약자 이름과 여권, 확인서를 준비합니다.'},
            {'id': 'deposit', 'prompt': '보증금 안내를 받았어요. 어떻게 확인할까요?',
             'options': [{'id': 'confirm', 'text': '금액·결제 방법·환급 시점과 영수증을 확인한다'}, {'id': 'guess', 'text': '추측해서 금액을 보낸다'}, {'id': 'qr', 'text': '출처를 모르는 개인 QR로 송금한다'}],
             'correctOptionId': 'confirm', 'explanation': '추가 비용은 공식 프런트에서 조건을 확인하세요. 체크아웃 시간과 보증금 반환 방식도 함께 물어보면 좋아요.'},
        ],
    },
    {
        'id': 'didi', 'title': '디디 차량 호출',
        'description': '목적지 설정부터 차량 확인까지 연습해요.', 'reward': 100,
        'steps': [
            {'id': 'destination', 'prompt': '디디에서 호텔로 가는 차를 호출해 볼까요? 가장 먼저 할 일은?',
             'options': [{'id': 'destination', 'text': '출발 위치와 중문 목적지 주소를 지도에서 확인한다'}, {'id': 'first', 'text': '검색 결과의 첫 장소를 바로 선택한다'}, {'id': 'english', 'text': '도시가 달라도 영어 이름만 같으면 선택한다'}],
             'correctOptionId': 'destination', 'explanation': '같은 이름의 장소가 여러 개 있을 수 있어요. 도시·주소·지도의 핀과 공항 승차 구역을 확인합니다.'},
            {'id': 'request', 'prompt': '차량 종류를 고른 다음 확인할 것은?',
             'options': [{'id': 'estimate', 'text': '예상 요금·승차 위치·결제 수단을 확인한 뒤 호출한다'}, {'id': 'cancel', 'text': '조건을 읽지 않고 여러 차량을 동시에 호출한다'}, {'id': 'outside', 'text': '앱 밖에서 별도 송금을 약속한다'}],
             'correctOptionId': 'estimate', 'explanation': '호출 전 표시되는 조건을 확인하세요. 이 체험의 요금과 차량은 예시이며 실제 호출이 이루어지지 않습니다.'},
            {'id': 'verify', 'prompt': '차량이 도착했어요. 탑승 전에 무엇을 확인할까요?',
             'options': [{'id': 'color', 'text': '자동차 색상만 보고 탄다'}, {'id': 'plate', 'text': '앱의 번호판·차종·기사 정보를 실제 차량과 대조한다'}, {'id': 'wave', 'text': '손을 흔드는 사람의 차에 바로 탄다'}],
             'correctOptionId': 'plate', 'explanation': '차량 정보가 일치하는지 확인하고 탑승하세요. 문제가 생기면 앱 내 공식 지원 기능을 이용합니다.'},
        ],
    },
]
SCENARIO_BY_ID = {scenario['id']: scenario for scenario in SCENARIOS}
