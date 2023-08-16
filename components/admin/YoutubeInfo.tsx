import React, { useState, useCallback, useEffect } from 'react';
import { apiCall } from '@utils/apis';
import { dateYYYYMMDD } from '@utils/dates';
import { css } from '@emotion/react';
import { mq, colors } from '@styles/theme';

const inputStyle = css`
  & > label {
    display: block;
    margin: 3px auto;
  }
  & > input {
    margin-bottom: 5px;
    width: 100%;
    height: 30px;
    box-sizing: border-box;
  }
`;

interface Props {
  user: any;
  test?: any
};
type ChannelInfoKeys = 'channelId' | 'channelTitle' | 'group';


const Vlog = ({ user }: Props) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [channelInfo, setChannelInfo] = useState<{[key in ChannelInfoKeys]: string}>({
    channelId: '', channelTitle: '', group: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [displayForm, setDisplayForm] = useState<boolean>(false);

  const handleChangeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.currentTarget;
    setChannelInfo(prev => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const fetchChannels = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await apiCall({
        method: 'get',
        url: '/vlogdev/channel',
      });
      setChannels(data.items);
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addChannel = useCallback(async () => {
    if (isLoading) return;
    if (Object.entries(channelInfo).some(i => !i[1])) return window.alert('모든 항목을 입력해주세요.');
    setIsLoading(true);
    try {
      const res = await apiCall({
        method: 'post',
        url: '/vlogdev/channel',
        headers: { Authorization: (user as any).signInUserSession.idToken.jwtToken },
        data: channelInfo,
      });
      window.alert(`${channelInfo.channelTitle} 채널 등록 완료`);
      setChannels(prev => ([
        ...prev,
        channelInfo,
      ]));
      setChannelInfo({ channelId: '', channelTitle: '', group: '' });
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [channelInfo, user, isLoading]);

  const deleteChannel = useCallback(async (channelTitle: string, group: string) => {
    if (isLoading) return;
    if (window.confirm(`${channelTitle} 삭제 하시겠습니까?`)) {
      setIsLoading(true);
      try {
        const res = await apiCall({
          method: 'delete',
          url: '/vlogdev/channel',
          headers: { Authorization: (user as any).signInUserSession.idToken.jwtToken },
          data: {
            channelTitle,
            group,
          },
        });
        setChannels(prev => {
          const idx = prev.findIndex(p => p.channelTitle === channelTitle && p.group === group);
          idx > -1 && prev.splice(idx, 1);
          return prev;
        });
        window.alert(`${channelTitle} 채널 삭제 완료 `);
      } catch(e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);
  return (
    <div css={css`
      margin-bottom: 30px;
    `}>
      <div css={css`
        display: flex;
        justify-content: space-between;
        
      `}>
        <h3>YOUTUBE 채널 추가</h3>
        <button
          css={css`
            border: none;
            background: inherit;
            color: blue;
            cursor: pointer;
          `}
          onClick={() => setDisplayForm(prev => !prev)}
          >
            { displayForm ? '닫기' : '열기'}
          </button>
      </div>
      {
        displayForm &&
        <form>
          {
            ['channelId', 'channelTitle', 'group'].map((v) => (
              <div key={v} css={inputStyle}>
                <label htmlFor={v}>
                  {v}
                </label>
                <input
                  id={v}
                  value={channelInfo[v as ChannelInfoKeys]}
                  onChange={handleChangeInput}
                />
              </div>
            ))
          }
          <div css={css`
            text-align: right;
          `}>
            <button
              type="button"
              onClick={addChannel}
              css={css`
                margin: 10px auto;
                height: 40px;
                width: 100%;
                border: 1px solid blue;
                border-radius: 15px;
                background: blue;
                color: #fff;
                cursor: pointer;
              `}
            >추가</button>
          </div>
        </form>
      }

      <h3>YOUTUBE 채널 리스트</h3>
      {
        !!channels.length &&
        <table css={css`
          margin: 0 auto;
          text-align: center;
        `}>
          <thead>
            <tr
              key="table-head"
              css={css`
                background-color: ${colors.lusciousRed};
                border-color: ${colors.lusciousRed};
                color: #fff;
              `}
            >
              <th>Idx</th>
              <th>제목</th>
              <th>그룹</th>
              <th>개설날짜</th>
              <th>썸네일</th>
              <th>ID</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {
              channels.map((c, idx) => (
                <tr
                  key={c.channelId}
                  css={css`
                    background: ${c.publishTime > 0 ? 'inherit' : colors.lusciousRed};
                    opacity: ${c.publishTime > 0 ? 1 : 0.5};
                    & > td:last-of-type {
                      background: #fff;
                    }
                  `}
                >
                  <td>
                    {idx + 1}
                  </td>
                  <td>
                    { c.channelTitle }
                  </td>
                  <td>
                    { c.group }
                  </td>
                  <td>
                    { dateYYYYMMDD(c.publishTime) }
                  </td>
                  <td>
                    {
                      c.thumbnails &&
                        <div css={css`
                          background: no-repeat 100%/cover url(${c.thumbnails.high.url});
                          height: 30px;
                          width: 30px;
                        `}/>
                    }
                  </td>
                  <td>
                    { c.channelId }
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => deleteChannel(c.channelTitle, c.group)}
                      // onClick={() => handleClickRemove(c.channelTitle, c.group)}
                      css={css`
                        background: inherit;
                        border: 1px solid red;
                        border-radius: 10px;
                        color: red;
                        cursor: pointer;
                      `}
                    >삭제</button>
                  </td>
                </tr>)
              )
            }

          </tbody>
        </table>
      }
    </div>
  );
};

export default Vlog;
