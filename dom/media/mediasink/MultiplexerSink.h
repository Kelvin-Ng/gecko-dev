/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef MultiplexerSink_h_
#define MultiplexerSink_h_

#include "MediaSink.h"
#include "VideoSink.h"
#include "DecodedStream.h"

namespace mozilla {

class MultiplexerSink : public MediaSink {
 public:
  MultiplexerSink(MediaSink* aVideoSink, MediaSink* aDecodedStream);

  RefPtr<EndedPromise> OnEnded(TrackType aType) override;
  media::TimeUnit GetEndTime(TrackType aType) const override;
  media::TimeUnit GetPosition(TimeStamp* aTimeStamp = nullptr) override;
  bool HasUnplayedFrames(TrackType aType) const override;
  media::TimeUnit UnplayedDuration(TrackType aType) const override;
  void SetVolume(double aVolume) override;
  void SetStreamName(const nsAString& aStreamName) override;
  void SetPlaybackRate(double aPlaybackRate) override;
  void SetPreservesPitch(bool aPreservesPitch) override;
  void SetPlaying(bool aPlaying) override;
  double PlaybackRate() const override;
  void Redraw(const VideoInfo& aInfo) override;
  nsresult Start(const media::TimeUnit& aStartTime,
                 const MediaInfo& aInfo) override;
  void Stop() override;
  bool IsStarted() const override;
  bool IsPlaying() const override;
  const AudioDeviceInfo* AudioDevice() const override;
  void Shutdown() override;
  void SetSecondaryVideoContainer(VideoFrameContainer* aSecondary) override;
  void GetDebugInfo(dom::MediaSinkDebugInfo& aInfo) override;

 private:
  virtual ~MultiplexerSink() = default;

  const RefPtr<MediaSink> mVideoSink;
  const RefPtr<MediaSink> mDecodedStream;
};

}  // namespace mozilla

#endif
