# 프로젝트 이미지

이용자 캐릭터는 기본 내장 `image_gen`으로 새로 생성한 `public/avatars/traveler-atlas-v2.png`입니다. [생성 프롬프트](traveler-atlas-v2.prompt.txt)를 함께 보관합니다. 기존 코드로 조합한 도트 그림은 교체했습니다.

원본 1254×1254 투명 PNG를 변경하지 않고, SVG 뷰포트가 4열·4행의 프레임을 표시합니다. 행 순서는 정면·왼쪽·오른쪽·뒷모습이고 각 행은 네 걷기 프레임입니다. 실제 셀 크기는 313.5px이며 월드에서는 약 76px 크기로 표시합니다.

표현 방향은 [ZEP 공식 아바타 이미지](https://zep.us/images/thumbnail.png)와 [공식 공간 예시](https://zep.us/images/banners/reference_banner_background.png)를 참고했습니다. 생성한 원화를 앱 자산으로 사용합니다.

안내 NPC **중톡이**는 사용자가 지정한 Second Brain 브랜드 PNG 원본인 `public/brand/jungtoki.png`를 사용합니다. 필드·대화창·허브에 같은 캐릭터를 표시합니다. 출처는 [브랜드 설명](../../public/brand/README.md)에 기록했습니다.

## 호텔 예약 실습 사진

[호텔 객실 이미지](../../public/practice/hotel-room-v1.png)는 기본 내장 `image_gen`으로 생성한 가상 호텔 사진입니다. 실제 호텔의 사진이나 광고 자료가 아니며, 예약 실습의 검색 결과와 객실 상세 화면에서만 사용합니다. [생성 프롬프트](hotel-room-v1.prompt.txt)를 함께 보관합니다.

생성 원본 `01a1e2a7-c4b7-7d11-8727-89dad63b5817/exec-df49073a-54bd-4aa3-a237-4d7bdd4c3b62.png`를 프로젝트의 `public/practice/hotel-room-v1.png`로 복사했습니다. 원본 이미지 데이터는 수정하지 않았고 표시 크기와 크롭은 CSS로 정합니다.
